import os from 'os';

export class SystemHealth {
    /**
     * Returns memory usage information in a human-readable format
     */
    static getMemoryStatus() {
        const total = os.totalmem();
        const free = os.freemem();
        const used = total - free;
        
        const usedGB = Number((used / 1024 / 1024 / 1024).toFixed(2));
        const totalGB = Number((total / 1024 / 1024 / 1024).toFixed(2));
        const percent = Number(((used / total) * 100).toFixed(1));

        // process.memoryUsage() gives current Node.js heap info
        const nodeMem = process.memoryUsage();
        const nodeRSS_MB = Number((nodeMem.rss / 1024 / 1024).toFixed(1));
        const nodeHeapUsed_MB = Number((nodeMem.heapUsed / 1024 / 1024).toFixed(1));

        return {
            formatted: `${percent}% (${usedGB}GB / ${totalGB}GB) [Node: ${nodeRSS_MB}MB]`,
            usedGB,
            totalGB,
            percent,
            nodeRSS_MB,
            nodeHeapUsed_MB
        };
    }

    /**
     * Static helper for clean logging
     */
    static logMemory(label: string = 'Current Use') {
        const status = this.getMemoryStatus();
        console.log(`[SYSTEM] ${label}: ${status.formatted}`);
    }
}
