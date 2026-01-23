import { useState, useEffect, useCallback } from 'react'
import { getContract, listenToEvent, executeTransaction, estimateGas } from '../utils/blockchain'

/**
 * @hook useContract
 * @description React hook for interacting with smart contracts
 * Provides loading states, error handling, and transaction management
 */
export const useContract = (contractAddress, contractABI, needsSigner = true) => {
    const [contract, setContract] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [transactionState, setTransactionState] = useState({
        pending: false,
        hash: null,
        error: null
    })

    // Initialize contract
    useEffect(() => {
        const initContract = async () => {
            try {
                setLoading(true)
                const contractInstance = await getContract(contractAddress, contractABI, needsSigner)
                setContract(contractInstance)
                setError(null)
            } catch (err) {
                console.error('Contract initialization failed:', err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        if (contractAddress && contractABI) {
            initContract()
        }
    }, [contractAddress, contractABI, needsSigner])

    /**
     * Call a read-only contract method
     */
    const call = useCallback(async (method, ...args) => {
        if (!contract) {
            throw new Error('Contract not initialized')
        }

        try {
            const result = await contract[method](...args)
            return { success: true, data: result }
        } catch (err) {
            console.error(`Contract call ${method} failed:`, err)
            return { success: false, error: err.message }
        }
    }, [contract])

    /**
     * Send a transaction to the contract
     */
    const send = useCallback(async (method, args = [], options = {}) => {
        if (!contract) {
            throw new Error('Contract not initialized')
        }

        try {
            setTransactionState({ pending: true, hash: null, error: null })

            const result = await executeTransaction(contract, method, args, options)

            if (result.success) {
                setTransactionState({
                    pending: false,
                    hash: result.transactionHash,
                    error: null
                })
            } else {
                setTransactionState({
                    pending: false,
                    hash: null,
                    error: result.error
                })
            }

            return result
        } catch (err) {
            const errorMessage = err.message
            setTransactionState({
                pending: false,
                hash: null,
                error: errorMessage
            })
            return { success: false, error: errorMessage }
        }
    }, [contract])

    /**
     * Estimate gas for a transaction
     */
    const estimateTransactionGas = useCallback(async (method, ...args) => {
        if (!contract) {
            throw new Error('Contract not initialized')
        }

        try {
            return await estimateGas(contract, method, ...args)
        } catch (err) {
            console.error('Gas estimation failed:', err)
            throw err
        }
    }, [contract])

    /**
     * Listen to a contract event
     */
    const addEventListener = useCallback((eventName, callback) => {
        if (!contract) {
            console.warn('Contract not initialized, cannot add event listener')
            return () => { }
        }

        return listenToEvent(contract, eventName, callback)
    }, [contract])

    /**
     * Reset transaction state
     */
    const resetTransaction = useCallback(() => {
        setTransactionState({ pending: false, hash: null, error: null })
    }, [])

    return {
        contract,
        loading,
        error,
        transactionState,
        call,
        send,
        estimateTransactionGas,
        addEventListener,
        resetTransaction
    }
}

export default useContract
