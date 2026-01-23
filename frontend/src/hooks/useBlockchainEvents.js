import { useState, useEffect, useCallback } from 'react'
import { getPastEvents } from '../utils/blockchain'

/**
 * @hook useBlockchainEvents
 * @description Listen to blockchain events and cache them in local state
 * Provides real-time updates for contract events
 */
export const useBlockchainEvents = (contract, eventName, options = {}) => {
    const {
        fromBlock = 0,
        toBlock = 'latest',
        autoRefresh = true,
        refreshInterval = 30000 // 30 seconds
    } = options

    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [lastFetchedBlock, setLastFetchedBlock] = useState(fromBlock)

    /**
     * Fetch historical events
     */
    const fetchEvents = useCallback(async () => {
        if (!contract) return

        try {
            setLoading(true)
            const pastEvents = await getPastEvents(
                contract,
                eventName,
                lastFetchedBlock,
                toBlock
            )

            setEvents(prevEvents => {
                // Merge new events with existing ones, avoiding duplicates
                const existingHashes = new Set(
                    prevEvents.map(e => e.transactionHash + e.logIndex)
                )

                const newEvents = pastEvents.filter(
                    e => !existingHashes.has(e.transactionHash + e.logIndex)
                )

                return [...prevEvents, ...newEvents].sort(
                    (a, b) => b.blockNumber - a.blockNumber
                )
            })

            // Update last fetched block
            if (pastEvents.length > 0) {
                const latestBlock = Math.max(
                    ...pastEvents.map(e => e.blockNumber)
                )
                setLastFetchedBlock(latestBlock + 1)
            }

            setError(null)
        } catch (err) {
            console.error(`Failed to fetch ${eventName} events:`, err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [contract, eventName, lastFetchedBlock, toBlock])

    /**
     * Listen to new events in real-time
     */
    useEffect(() => {
        if (!contract || !eventName) return

        const handleNewEvent = (...args) => {
            const event = args[args.length - 1] // Last arg is the event object

            const formattedEvent = {
                event: event.eventName,
                args: event.args,
                blockNumber: event.blockNumber,
                transactionHash: event.transactionHash,
                logIndex: event.logIndex
            }

            setEvents(prevEvents => [formattedEvent, ...prevEvents])
        }

        // Listen to new events
        contract.on(eventName, handleNewEvent)

        // Cleanup
        return () => {
            contract.off(eventName, handleNewEvent)
        }
    }, [contract, eventName])

    /**
     * Auto-refresh events periodically
     */
    useEffect(() => {
        if (!autoRefresh) return

        fetchEvents() // Initial fetch

        const interval = setInterval(() => {
            fetchEvents()
        }, refreshInterval)

        return () => clearInterval(interval)
    }, [autoRefresh, refreshInterval, fetchEvents])

    /**
     * Manual refresh
     */
    const refresh = useCallback(() => {
        fetchEvents()
    }, [fetchEvents])

    /**
     * Clear all events
     */
    const clearEvents = useCallback(() => {
        setEvents([])
        setLastFetchedBlock(fromBlock)
    }, [fromBlock])

    /**
     * Filter events by criteria
     */
    const filterEvents = useCallback((filterFn) => {
        return events.filter(filterFn)
    }, [events])

    return {
        events,
        loading,
        error,
        refresh,
        clearEvents,
        filterEvents
    }
}

export default useBlockchainEvents
