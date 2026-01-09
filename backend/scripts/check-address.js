const { ethers } = require('ethers');
require('dotenv').config({ path: './.env' });

async function check() {
    const rpc = process.env.RPC_URL;
    if (!rpc) {
        console.log("No RPC_URL");
        return;
    }
    const provider = new ethers.JsonRpcProvider(rpc);

    // The address from contract-address.json
    const address = "0x3ac77E54B63f6AF66A3fD4AEAB6092eD51fC03f2";

    console.log(`Checking code at ${address} on network...`);
    const code = await provider.getCode(address);

    if (code === '0x') {
        console.log("❌ No code found at this address. It is an EOA or empty.");
    } else {
        console.log(`✅ Code found! Length: ${code.length} chars`);
        console.log("This is a valid contract.");
    }
}

check();
