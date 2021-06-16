// Signers 15, 16, 17, 18, 19, 0 are already miners

import { ethers } from "hardhat";

import { solidity } from "ethereum-waffle";

import chai from "chai";

import { ZapToken } from "../typechain/ZapToken";

import { ZapTransfer } from '../typechain/ZapTransfer';

import { ZapLibrary } from "../typechain/ZapLibrary";

import { ZapDispute } from "../typechain/ZapDispute";

import { ZapStake } from "../typechain/ZapStake";

import { ZapMaster } from "../typechain/ZapMaster";

import { Zap } from "../typechain/Zap";

import { BigNumber, ContractFactory } from "ethers";
import { FormatTypes } from "ethers/lib/utils";

const { expect } = chai;

chai.use(solidity);

let zapToken: ZapToken;

let zapTransfer: ZapTransfer;

let zapLibrary: ZapLibrary;

let zapDispute: ZapDispute;

let zapStake: ZapStake;

let zapMaster: ZapMaster;

let zap: Zap;

let signers: any;

describe("Dynamic Miner Tests", () => {

    beforeEach(async () => {

        signers = await ethers.getSigners();

        const zapTokenFactory: ContractFactory = await ethers.getContractFactory(
            "ZapToken",
            signers[0]
        )

        zapToken = (await zapTokenFactory.deploy()) as ZapToken;
        await zapToken.deployed()

        const zapTransferFactory: ContractFactory = await ethers.getContractFactory(
            "ZapTransfer",
            signers[0]
        )

        zapTransfer = (await zapTransferFactory.deploy()) as ZapTransfer
        await zapTransfer.deployed();

        const zapLibraryFactory: ContractFactory = await ethers.getContractFactory("ZapLibrary",
            {
                libraries: {
                    ZapTransfer: zapTransfer.address,
                },
                signer: signers[0]
            }
        );

        zapLibrary = (await zapLibraryFactory.deploy()) as ZapLibrary
        await zapLibrary.deployed()

        const zapDisputeFactory: ContractFactory = await ethers.getContractFactory("ZapDispute", {

            libraries: {
                ZapTransfer: zapTransfer.address,
            },
            signer: signers[0]

        });

        zapDispute = (await zapDisputeFactory.deploy()) as ZapDispute
        await zapDispute.deployed();

        const zapStakeFactory: ContractFactory = await ethers.getContractFactory("ZapStake", {

            libraries: {
                ZapTransfer: zapTransfer.address,
                ZapDispute: zapDispute.address
            },
            signer: signers[0]
        })

        zapStake = (await zapStakeFactory.deploy()) as ZapStake
        await zapStake.deployed()

        const zapFactory: ContractFactory = await ethers.getContractFactory("Zap", {

            libraries: {
                ZapStake: zapStake.address,
                ZapDispute: zapDispute.address,
                ZapLibrary: zapLibrary.address,
            },
            signer: signers[0]

        })

        zap = (await zapFactory.deploy(zapToken.address)) as Zap
        await zap.deployed()

        const zapMasterFactory: ContractFactory = await ethers.getContractFactory("ZapMaster", {
            libraries: {
                ZapTransfer: zapTransfer.address,
                ZapStake: zapStake.address
            },
            signer: signers[0]
        });

        zapMaster = (await zapMasterFactory.deploy(zap.address, zapToken.address)) as ZapMaster
        await zapMaster.deployed()

        for (var i = 0; i < signers.length; i++) {

            await zapToken.allocate(signers[i].address, 5000);

        }

    })

    it("Should have an initial totalSupply of 0", async () => {

        // Gets the total oracle tokens as a hexString
        const getSupply: BigNumber = await zapMaster.totalTokenSupply();

        // Convert the hexString to a number
        const supply: number = parseInt(getSupply._hex);

        // Expect total supply to be 0
        expect(supply).to.equal(0);
    })
    
    it("Should increase with staked miners", async () => {

        // Iterates through the length of signers
        for (var i = 0; i < signers.length; i++) {

            // Attach the ZapMaster instance to Zap
            zap = zap.attach(zapMaster.address);

            // Connects the 20 signers to the Zap.sol contract
            zap = zap.connect(signers[i]);

            // Stakes 1000 Zap to initiate a miner
            await zap.depositStake();
        }

        // Gets the total oracle tokens as a hexString
        const getSupply: BigNumber = await zapMaster.totalTokenSupply();

        // Convert the hexString to a number
        const supply: number = parseInt(getSupply._hex);

        // Expect total supply to be length of signers * 1000
        expect(supply).to.equal(signers.length * 1000);
    })

    it("Should submit multiple mining solutions", async () => {

        let x: string;

        let apix: string;

        // Request string
        const api: string = "json(https://api.pro.coinbase.com/products/ETH-USD/ticker).price";

        // Iterates through all 20 signers
        for (var i = 0; i < signers.length; i++) {

            // Attach the ZapMaster instance to Zap
            zap = zap.attach(zapMaster.address);

            // Connects the 20 signers to the Zap.sol contract
            zap = zap.connect(signers[i]);

            // Stakes 1000 Zap to initiate a miner
            await zap.depositStake();
        }

        zap = zap.connect(signers[0]);

        // Approves Zap.sol the amount to tip for requestData
        await zapToken.approve(zap.address, 5000)

        // Iterates the length of the requestQ array
        for (var i = 0; i < 52; i++) {

            x = "USD" + i;
            apix = api + i;

            // Submits the query string as the request
            // Each request will add a tip starting at 51 and count down until 0
            // Each tip will be stored inside the requestQ array
            await zap.requestData(apix, x, 1000, 52 - i);
        }

        // Fake values for each miner. Values are 1200 to 1219.
        // 20 values and although it's an even amount, 
        // the current median value is valuesArray[10] = 1210
        let valuesArray: number[] = [
            1203, 1209, 1213, 1204,
            1206, 1216, 1208, 1207,
            1201, 1212, 1219, 1218,
            1214, 1217, 1205, 1200,
            1210, 1215, 1211, 1202
        ]

        // Iterates through all 20 signers
        for (var i = 0; i < signers.length; i++) {

            // Connects the 20 signers to the Zap.sol contract
            zap = zap.connect(signers[i]);

            // Each Miner connected will submit a mining solution
            await zap.submitMiningSolution("nonce", 1, valuesArray[i]);

        }

        // Gets the recent challenge, requestIds, difficulty, tip
        const newCurrentVariables: any = await zap.getNewCurrentVariables();

        // Gets the timestamp of the value submitted for request 1
        // Returns the timestamp as a hexString
        const getTimestamp: BigNumber = await zapMaster.getTimestampbyRequestIDandIndex(1, 0);

        // Parses the timestamp from a hexString to an integer
        const timestamp: number = parseInt(getTimestamp._hex);

        // Gets the miners who mined the value for the specified requestId & timestamp
        const miners: string[] = await zapMaster.getMinersByRequestIdAndTimestamp(1, timestamp);

        expect(newCurrentVariables[1]).to.have.lengthOf(signers.length);

        expect(newCurrentVariables[1][10]).to.equal(1210);

        expect(miners).to.have.lengthOf(signers.length);

    })

    

})
