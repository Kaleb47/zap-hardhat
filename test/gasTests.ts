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

describe("Did Mine Test", () => {

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

        // Allocates 5000 ZAP to signer 0 
        await zapToken.allocate(signers[0].address, 5000);

        for (var i = 1; i <= 10; i++) {

            await zapToken.allocate(signers[i].address, 5000)
        }

        // Iterates through signers 1 through 10
        for (var i = 1; i <= 10; i++) {

            // Attach the ZapMaster instance to Zap
            zap = zap.attach(zapMaster.address);

            // Connects addresses 1-5 as the signer
            zap = zap.connect(signers[i]);

            // Stakes 1000 Zap to initiate a miner
            await zap.depositStake();
        }

    });

    it("SubmitMiningSolution", async () => {

        zap = zap.connect(signers[0]);

        // Approves Zap.sol the amount to tip for requestData
        await zapToken.approve(zap.address, 5000)

        // Request string
        const api: string = "json(https://api.pro.coinbase.com/products/ETH-USD/ticker).price";
        let x: string;
        let apix: string;

        // Request string
        const api2: string = "json(https://api.pro.coinbase.com/products/BTC-USD/ticker).price";
        let x2: string;
        let apix2: string;



        for (var i = 0; i < 52; i++) {

            x = "USD" + i
            apix = api + i;

            await zap.requestData(apix, x, 1000, 52 - i);

        }

        let receipt;
        let gases = []
        let benches = []

        for (var i = 1; i <= 5; i++) {

            // Connects address 1 as the signer
            zap = zap.connect(signers[i]);

            // Each Miner will submit a mining solution
            const submit = await zap.submitMiningSolution(
                "nonce",
                1,
                1200
            )

            receipt = await submit.wait();

            gases.push(parseInt(receipt.gasUsed._hex))

        }

        // zap = zap.connect(signers[0]);

        // // Approves Zap.sol the amount to tip for requestData
        // await zapToken.approve(zap.address, 5000)

        // for (var i = 0; i < 52; i++) {

        //     x2 = "USD" + i
        //     apix2 = api2 + i;

        //     await zap.requestData(apix2, x2, 1000, 52 - i);

        // }

        // for (var i = 6; i <= 10; i++) {

        //     // Connects address 1 as the signer
        //     zap = zap.connect(signers[i]);

        //     // Each Miner will submit a mining solution
        //     await zap.submitMiningSolution(
        //         "nonce",
        //         1,
        //         1300
        //     )

        // }

    })

    it("Transfers", async () => {

    })
});