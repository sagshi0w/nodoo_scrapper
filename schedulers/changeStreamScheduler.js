#!/usr/bin/env node

import ChangeStreamListener from '../utils/changeStreamListener.js';
import { closeDatabase } from '../utils/database.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class ChangeStreamScheduler {
  constructor() {
    this.listener = new ChangeStreamListener();
    this.isRunning = false;
  }

  /**
   * Start the change stream scheduler
   */
  async start() {
    try {
      console.log('🚀 Starting Change Stream Scheduler...');
      console.log('📡 Listening for user profile changes in real-time');
      console.log('🔄 Job matching will be triggered automatically for new/updated users');
      
      this.isRunning = true;
      
      // Start the change stream listener
      await this.listener.start();
      
      console.log('✅ Change Stream Scheduler started successfully');
      console.log('🔄 Listening for changes...');
      
      // Keep the process running
      this.keepAlive();
      
    } catch (error) {
      console.error('❌ Failed to start change stream scheduler:', error);
      throw error;
    }
  }

  /**
   * Stop the change stream scheduler
   */
  async stop() {
    try {
      console.log('🛑 Stopping Change Stream Scheduler...');
      
      this.isRunning = false;
      
      // Stop the change stream listener
      await this.listener.stop();
      
      // Close database connection
      await closeDatabase();
      
      console.log('✅ Change Stream Scheduler stopped successfully');
      
    } catch (error) {
      console.error('❌ Error stopping change stream scheduler:', error);
    }
  }

  /**
   * Keep the process alive and monitor status
   */
  keepAlive() {
    const statusInterval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(statusInterval);
        return;
      }
      
      const status = this.listener.getStatus();
      console.log(`📊 Status: Running=${status.isRunning}, Processed Users=${status.processedUsersCount}`);
      
    }, 60000); // Log status every minute
  }

  /**
   * Get scheduler status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      listener: this.listener.getStatus()
    };
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT. Shutting down gracefully...');
  if (global.scheduler) {
    await global.scheduler.stop();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM. Shutting down gracefully...');
  if (global.scheduler) {
    await global.scheduler.stop();
  }
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('❌ Uncaught Exception:', error);
  if (global.scheduler) {
    await global.scheduler.stop();
  }
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  if (global.scheduler) {
    await global.scheduler.stop();
  }
  process.exit(1);
});

// Start the scheduler
async function main() {
  try {
    global.scheduler = new ChangeStreamScheduler();
    await global.scheduler.start();
    
    console.log('🔄 Change Stream Scheduler is running. Press Ctrl+C to stop.');
    
  } catch (error) {
    console.error('❌ Failed to start scheduler:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default ChangeStreamScheduler;

