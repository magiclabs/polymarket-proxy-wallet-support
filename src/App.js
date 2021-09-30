import React, { useState, useEffect } from "react";
import "./styles.css";
import { Magic } from "magic-sdk";
import Web3 from 'web3'
import {Interface} from "@ethersproject/abi";
import ERC20ABI from "./ERC20";
import proxyWalletFactoryABI from './ProxyWalletFactoryABI'
import {getProxyWalletAddress} from '@polymarket/sdk'

const magic = new Magic('pk_live_99ABD23F9F1C8266', {
    network: {
        rpcUrl: 'https://polygon-rpc.com/'
    }
});

const TEST_TOKEN_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
export const PROXY_WALLET_FACTORY_ADDRESS = '0xaB45c5A4B0c941a2F231C04C3f49182e1A254052';

const encodeTokenTransfer = (recipientAddress, amount) =>
    new Interface(ERC20ABI).encodeFunctionData("transfer(address,uint256)", [recipientAddress, amount]);

const erc20TransferTransaction = (
    tokenAddress,
    recipient,
    amount,
) => ({
    to: tokenAddress,
    typeCode: "1",
    data: encodeTokenTransfer(recipient, amount),
    value: "0",
});

export default function App() {
    const [email, setEmail] = useState("");
    const [proxyWalletAddress, setProxyWalletAddress] = useState("");
    const [publicAddress, setPublicAddress] = useState("");
    const [destinationAddress, setDestinationAddress] = useState("");
    const [sendAmount, setSendAmount] = useState(0);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userMetadata, setUserMetadata] = useState({});
    const [txHash, setTxHash] = useState("");
    const [USDCBalance, setUSDCBalance] = useState("");
    const [sendingTransaction, setSendingTransaction] = useState(false);

    useEffect(() => {
        magic.user.isLoggedIn().then(async magicIsLoggedIn => {
            setIsLoggedIn(magicIsLoggedIn);
            if (magicIsLoggedIn) {
                const { publicAddress } = await magic.user.getMetadata();

                const proxyAddress = getProxyWalletAddress(PROXY_WALLET_FACTORY_ADDRESS, publicAddress);

                const web3 = new Web3(magic.rpcProvider);

                const erc20Contract = new web3.eth.Contract(ERC20ABI, TEST_TOKEN_ADDRESS);

                const erc20Balance = await erc20Contract.methods.balanceOf(proxyAddress).call();

                const ethUSDTBalance = Web3.utils.fromWei(erc20Balance, 'micro');

                setPublicAddress(publicAddress);
                setUSDCBalance(ethUSDTBalance);
                setProxyWalletAddress(proxyAddress);
                setUserMetadata(await magic.user.getMetadata());
            }
        });
    }, [isLoggedIn]);

    const login = async () => {
        await magic.auth.loginWithMagicLink({ email });
        setIsLoggedIn(true);
    };

    const logout = async () => {
        await magic.user.logout();
        setIsLoggedIn(false);
    };

    const handleSendUSDC = async () => {
        const web3 = new Web3(magic.rpcProvider);
        const proxyWalletFactory = new web3.eth.Contract(proxyWalletFactoryABI, PROXY_WALLET_FACTORY_ADDRESS);

        const transferAmount = web3.utils.toWei(sendAmount, 'micro');

        const erc20Transaction = erc20TransferTransaction(
            TEST_TOKEN_ADDRESS,
            destinationAddress,
            transferAmount,
        );

        const tx = await proxyWalletFactory.methods.proxy([
            erc20Transaction,
        ]).send({from: publicAddress});

        console.log('txn', tx.txHash);
        setTxHash(tx.txHash)
    };

    return (
        <div className="App">
            {!isLoggedIn ? (
                <div className="container">
                    <h1>Please sign up or login</h1>
                    <input
                        type="email"
                        name="email"
                        required="required"
                        placeholder="Enter your email"
                        onChange={event => {
                            setEmail(event.target.value);
                        }}
                    />
                    <button onClick={login}>Send</button>
                </div>
            ) : (
                <div>
                    <div className="container">
                        <h1>Current user: {userMetadata.email}</h1>
                        <button onClick={logout}>Logout</button>
                    </div>
                    <div className="container">
                        <h1>Proxy Wallet Address</h1>
                        <div className="info">
                            {proxyWalletAddress}
                        </div>
                    </div>
                    <div className="container">
                        <h1>Public Address</h1>
                        <div className="info">
                            {publicAddress}
                        </div>
                    </div>
                    <div className="container">
                        <h1>USDC balance</h1>
                        <div className="info">
                            {USDCBalance}
                        </div>
                    </div>
                    <div className="container">
                        <h1>Send Transaction</h1>
                        {txHash ? (
                            <div>
                                <div>Send transaction success</div>
                                <div className="info">
                                    {txHash}
                                </div>
                            </div>
                        ) : sendingTransaction ? (<div className="sending-status">
                            Sending transaction
                        </div>) : (
                            <div />
                        )}
                        <input
                            type="text"
                            name="destination"
                            className="full-width"
                            required="required"
                            placeholder="Destination address"
                            onChange={event => {
                                setDestinationAddress(event.target.value);
                            }}
                        />
                        <input
                            type="text"
                            name="amount"
                            className="full-width"
                            required="required"
                            placeholder="Amount in USDC"
                            onChange={event => {
                                setSendAmount(event.target.value);
                            }}
                        />
                        <button id="btn-send-txn" onClick={handleSendUSDC}>
                            Send Transaction
                        </button>
                    </div>
                </div>

            )}
        </div>
    );
}
