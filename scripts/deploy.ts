import { ethers } from "hardhat";

const hre = require("hardhat")

const params = ["param1", "param2"];

const tokensForOwner = ethers.BigNumber.from("1500000000000000000000000000000");
const tokensForSubscriber = ethers.BigNumber.from("50000000000000000000000000000");
const approveTokens = ethers.BigNumber.from("1000000000000000000000000000000");

//TODO move these functions to another file

async function main() {

  let signers = await ethers.getSigners();


  let owner = signers[0]
  const endpoint = ["Zap Price"]
  const specifier = ethers.utils.formatBytes32String(endpoint[0])
  const params = [
    ethers.utils.formatBytes32String("int")

  ];
 
 let broker = signers[3];

  const tokenFactory = await ethers.getContractFactory('ZapToken', signers[0]);
  const zapToken = await tokenFactory.deploy();
  await zapToken.deployed();
  console.log(`TOKEN address is ${zapToken.address}`)
  const coordinator = await ethers.getContractFactory('ZapCoordinator', signers[0]);
  const Coordinator = await coordinator.deploy();
  console.log(`Coordinator address is ${Coordinator.address}`)
  const arbiter = await ethers.getContractFactory('Arbiter', signers[0]);
  const Arbiter = await arbiter.deploy(Coordinator.address);
  console.log(`Arbiter address is ${Arbiter.address}`)
  const currentcost = await ethers.getContractFactory('CurrentCost', signers[0])
  const CurrentCost = await currentcost.deploy(Coordinator.address);
  console.log(`CurrentCost address is ${CurrentCost.address}`)
  const database = await ethers.getContractFactory('Database', signers[0])
  const Database = await database.deploy();
  console.log(`Database address is ${Database.address}`)
  const dispatch = await ethers.getContractFactory('Dispatch', signers[0])
  const Dispatch = await dispatch.deploy(Coordinator.address);
  console.log(`Dispatch address is ${Dispatch.address}`)
  const faucetContract = await ethers.getContractFactory('Faucet', signers[0]);
  const faucet = await faucetContract.deploy(zapToken.address);
  await faucet.deployed();
  console.log(`FAUCET address is ${faucet.address}`)
  const registry = await ethers.getContractFactory('Registry', signers[0])
  const Registry = await registry.deploy(Coordinator.address);
  // Transfer ownership before creating bondage contract
  console.log(`REGISTRY address is ${Registry.address}`)
  await Database.transferOwnership(Coordinator.address, { gasLimit: '50000', gasPrice: "20000000000" });
  console.log("transferring ownership")
  const bondage = await ethers.getContractFactory('Bondage', signers[0]);
  const Bondage = await bondage.deploy(Coordinator.address);
  console.log(`Bondage address is ${Bondage.address}`)

  await Coordinator.addImmutableContract('DATABASE', Database.address, { gasLimit: '75000', gasPrice: "20000000000" });
  console.log("adding DATABASE")
  await Coordinator.addImmutableContract('ARBITER', Arbiter.address, { gasLimit: '75000', gasPrice: "20000000000" });
  console.log("ADDING ARBITER")
  await Coordinator.addImmutableContract('FAUCET', faucet.address, { gasLimit: '75000', gasPrice: "20000000000" });
  console.log("FAUCET")
  await Coordinator.addImmutableContract('ZAP_TOKEN', zapToken.address, { gasLimit: '75000', gasPrice: "20000000000" });

  console.log("finished adding immuttable contracts")
  //await Coordinator.addImmutableContract('DISPATCH', Dispatch.address)
  //await Coordinator.addImmutableContract('BONDAGE', Bondage.address);
  await Coordinator.updateContract('REGISTRY', Registry.address, { gasLimit: '150000', gasPrice: "20000000000" });
  await Coordinator.updateContract('CURRENT_COST', CurrentCost.address, { gasLimit: '150000', gasPrice: "20000000000" });
  await Coordinator.updateContract('DISPATCH', Dispatch.address, { gasLimit: '150000', gasPrice: "20000000000" });

  await Coordinator.updateContract('BONDAGE', Bondage.address, { gasLimit: '150000', gasPrice: "20000000000" });
  console.log('finished updates')
  await Coordinator.updateAllDependencies({ gasLimit: '600000', gasPrice: "20000000000" });
  console.log("RUnning FAUCET")
  await hre.run('faucet')
  //await hre.run('initiateProvider')
  //await hre.run('initiateProviderCurve')

  // Approve the amount of Zap
  await zapToken.allocate(owner.address, tokensForOwner)
  await zapToken.allocate(broker.address, tokensForSubscriber)
  await zapToken.connect(broker).approve(Bondage.address, approveTokens)
  const subscriberFactory = await ethers.getContractFactory(
    'TestClient'
  );
  const offchainSubscriberFactory = await ethers.getContractFactory(
    'OffChainClient'
  );

  const oracleFactory = await ethers.getContractFactory(
    'TestProvider'
  );
  const subscriber = (await subscriberFactory.deploy(
    zapToken.address,
    Dispatch.address,
    Bondage.address,
    Registry.address
  ))

  const offchainsubscriber = (await offchainSubscriberFactory.deploy(
    zapToken.address,
    Dispatch.address,
    Bondage.address,
    Registry.address,
  ))

  await subscriber.deployed();
  await offchainsubscriber.deployed();
  const oracle = (await oracleFactory.deploy(
    Registry.address,
    false
  ))
  await oracle.deployed()

  const dotFactoryFactory = await ethers.getContractFactory(
    'DotFactoryFactory',
    signers[0]
  );
  const genericTokenFactory = await ethers.getContractFactory(
    'TokenFactory',
    signers[0]
  );
  let generictoken = (await genericTokenFactory.deploy());
  await generictoken.deployed();
  await dotFactoryFactory.deploy(Coordinator.address, generictoken.address);
  
  /**
   * MINERS
   */

  const ZapGettersLibrary = await ethers.getContractFactory("ZapGettersLibrary", signers[0]);
  const zapGettersLibrary = await ZapGettersLibrary.deploy();
  console.log("deployed ZapGettersLibrary")

  const ZapTransfer = await ethers.getContractFactory("ZapTransfer", signers[0]);
  const zapTransfer = await ZapTransfer.deploy();
  console.log("deployed ZapTransfer")

  const ZapDispute = await ethers.getContractFactory("ZapDispute", {
    libraries: {
      ZapTransfer: zapTransfer.address,
    },
    signer: signers[0]
  });
  const zapDispute = await ZapDispute.deploy();
  console.log("deployed ZapDispute: " + zapDispute.address)

  const ZapStake = await ethers.getContractFactory("ZapStake", {
    libraries: {
      ZapTransfer: zapTransfer.address,
      ZapDispute: zapDispute.address
    },
    signer: signers[0]
  });
  const zapStake= await ZapStake.deploy();
  console.log("deployed ZapStake")

  const ZapLibrary = await ethers.getContractFactory("ZapLibrary", 
  {
    libraries: {
      ZapTransfer: zapTransfer.address,
    },
    signer: signers[0]
  });
  const zapLibrary = await ZapLibrary.deploy();
  console.log("deployed ZapLibrary: " + zapLibrary.address)

  const Zap = await ethers.getContractFactory("Zap", 
  {
    libraries: {
      ZapStake: zapStake.address,
      ZapDispute: zapDispute.address,
      ZapLibrary: zapLibrary.address,
      // ZapTransfer: zapTransfer.address
    },
    signer: signers[0]
  });
  let zap = await Zap.deploy("0x5fbdb2315678afecb367f032d93f642f64180aa3");
  zap = zap.connect(signers[0])

  const ZapMaster = await ethers.getContractFactory("ZapMaster", {
    libraries: {
      ZapTransfer: zapTransfer.address,
      ZapStake: zapStake.address
    },
    signer: signers[0]
  });
  const zapMaster = await ZapMaster.deploy(zap.address, "0x5fbdb2315678afecb367f032d93f642f64180aa3");
  console.log("ZapMaster Address: " + zapMaster.address)
}

main()
  .then(() =>
    process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });