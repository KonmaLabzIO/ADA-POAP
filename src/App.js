import React, { useEffect, useState } from 'react';
import DateTimePicker from 'react-datetime-picker';
import './App.css';

import NamiWalletApi, { Cardano } from './nami-js';
import blockfrostApiKey from '../config.js';
let nami;


export default function App() {
    const [connected, setConnected] = useState()
    const [claimed, setClaimed] = useState()
    const [address, setAddress] = useState()
    const [nfts, setNfts] = useState([])
    const [balance, setBalance] = useState()
    const [transaction, setTransaction] = useState()
    const [amount, setAmount] = useState("10")
    const [txHash, setTxHash] = useState()
    const [recipientAddress, setRecipientAddress] = useState("addr_test1qqsjrwqv6uyu7gtwtzvhjceauj8axmrhssqf3cvxangadqzt5f4xjh3za5jug5rw9uykv2klc5c66uzahu65vajvfscs57k2ql")
    const [witnesses, setWitnesses] = useState()
    const [policy, setPolicy] = useState()
    const [builtTransaction, setBuiltTransaction] = useState()

    const [complextxHash, setComplextxHash] = useState()
    const [policyExpiration, setPolicyExpiration] = useState(new Date());
    const [complexTransaction, setComplexTransaction] = useState({
        recipients: [{
            address: "addr_test1qqsjrwqv6uyu7gtwtzvhjceauj8axmrhssqf3cvxangadqzt5f4xjh3za5jug5rw9uykv2klc5c66uzahu65vajvfscs57k2ql",
            amount: "3",
            mintedAssets: [{
                assetName: "MyNFT", quantity: '1', policyId: "Minting PolicyID",
                policyScript: "MintingPolicy"
            }]
        }]
    })

    useEffect(() => {
        const defaultDate = new Date();
        defaultDate.setTime(defaultDate.getTime() + (1 * 60 * 90 * 1000))
        setPolicyExpiration(defaultDate);

    }, [])
    useEffect(() => {
        async function t() {

            const S = await Cardano();
            nami = new NamiWalletApi(
                S,
                window.cardano,
                blockfrostApiKey
            )


            if (await nami.isInstalled()) {
                await nami.isEnabled().then(result => { setConnected(result) })

            }
        }

        t()
    }, [])




    const connect = async () => {
        // Connects nami wallet to current website 
        await nami.enable()
            .then(result => setConnected(result))
            .catch(e => console.log(e))
    }

    const getAddress = async () => {
        // retrieve address of nami wallet
        if (!connected) {
            await connect()
        }
        await nami.getAddress().then((newAddress) => { console.log(newAddress); setAddress(newAddress) })
    }


    const getBalance = async () => {
        if (!connected) {
            await connect()
        }
        await nami.getBalance().then(result => { console.log(result); setNfts(result.assets); setBalance(result.lovelace) })
    }


    const buildTransaction = async () => {
        if (!connected) {
            await connect()
        }

        const recipients = [{ "address": recipientAddress, "amount": amount }]
        let utxos = await nami.getUtxosHex();
        const myAddress = await nami.getAddress();

        let netId = await nami.getNetworkId();
        const t = await nami.transaction({
            PaymentAddress: myAddress,
            recipients: recipients,
            metadata: null,
            utxosRaw: utxos,
            networkId: netId.id,
            ttl: 3600,
            multiSig: null
        })
        console.log(t)
        setTransaction(t)
    }



    const buildFullTransaction = async () => {
        if (!connected) {
            await connect()
        }
        try {
            const recipients = complexTransaction.recipients
            const metadataTransaction = complexTransaction.metadata
            console.log(metadataTransaction)
            let utxos = await nami.getUtxosHex();

            const myAddress = await nami.getAddress();
            console.log(myAddress)
            let netId = await nami.getNetworkId();

            const t = await nami.transaction({
                PaymentAddress: myAddress,
                recipients: recipients,
                metadata: metadataTransaction,
                utxosRaw: utxos,
                networkId: netId.id,
                ttl: 3600,
                multiSig: null
            })
            setBuiltTransaction(t)
            const signature = await nami.signTx(t)
            console.log(t, signature, netId.id)
            const txHash = await nami.submitTx({
                transactionRaw: t,
                witnesses: [signature],

                networkId: netId.id
            })
            console.log(txHash)
            setComplextxHash(txHash)
        } catch (e) {
            console.log(e)
        }
    }



    const signTransaction = async () => {
        if (!connected) {
            await connect()
        }

        const witnesses = await nami.signTx(transaction)
        setWitnesses(witnesses)
    }

    const submitTransaction = async () => {
        let netId = await nami.getNetworkId();
        const txHash = await nami.submitTx({
            transactionRaw: transaction,
            witnesses: [witnesses],

            networkId: netId.id
        })
        setTxHash(txHash)

    }

    const createPolicy = async () => {
        console.log(policyExpiration)
        try {
            await nami.enable()


            const myAddress = await nami.getHexAddress();
            const receiverAddress = await nami.getAddress()
            let networkId = await nami.getNetworkId()
            const newPolicy = await nami.createLockingPolicyScript(myAddress, networkId.id, policyExpiration)

            setPolicy(newPolicy)
            setComplexTransaction((prevState) => {
                const state = prevState; 
                state.recipients[0].address = receiverAddress;
                state.recipients[0].mintedAssets[0].policyId = newPolicy.id;
                state.recipients[0].mintedAssets[0].policyScript = newPolicy.script;
                state.metadata = {
                    "721": {
                        [newPolicy.id]:
                            { [state.recipients[0].mintedAssets[0].assetName]: { name: "POAP", description: "POAP NFT", image: "ipfs://QmUb8fW7qm1zCLhiKLcFH9yTCZ3hpsuKdkTgKmC8iFhxV8" } }
                    }
                };
                return { ...state }
            })

        } catch (e) {
            console.log(e)
        }

    }

    const claimSendNFT = async () => {
        await createPolicy();
        await buildFullTransaction();
    }

    return (<>
        <div className="container">
            <h1 style={{ textAlign: "center" }}>A proof of attendance protocol</h1>
            <p>If you do not have Nami Wallet installed you can download Nami Wallet <a href="https://namiwallet.io/" target="_blank"> here</a>.</p>
            <div className="container">
                <div className="row" >
                    <h1>Connect your website to Nami Wallet</h1>
                </div>
                <div className="row" >
                    <button className={`button ${connected ? "success" : ""}`} onClick={connect} > {connected ? "Connected" : "Connect to Nami"} </button>
                </div>

                <div className="row" >
                    <h1>Claim</h1>
                </div>
                <div className="row" >
                    <button className={`button ${claimed ? "success" : ""}`} onClick={claimSendNFT} > {claimed ? "Claimed" : "Claim"} </button>
                </div>

            </div>
        </div>
    </>
    )
}



