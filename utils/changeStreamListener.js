import { connectToDatabase, getProfilesCollection } from './database.js';
import { matchJobsForUser } from './singleUserMatching.js';
import { createRequire } from 'module';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const require = createRequire(import.meta.url);
const nodemailer = require('nodemailer');

// Email configuration
const config = {
  notification: {
    email: {
      service: "Gmail",
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
      recipients: process.env.EMAIL_RECIPIENTS
        ? process.env.EMAIL_RECIPIENTS.split(',').map(email => email.trim())
        : ['nodooin86@gmail.com']
    }
  }
};

const transporter = nodemailer.createTransport({
  service: config.notification.email.service,
  auth: {
    user: config.notification.email.user,
    pass: config.notification.email.pass
  }
});

class ChangeStreamListener {
  constructor() {
    this.changeStream = null;
    this.isRunning = false;
    this.processedUsers = new Set(); // Track processed users to avoid duplicates
  }

  /**
   * Start listening to changes in the users collection
   */
  async start() {
    try {
      console.log('🔄 Starting MongoDB Change Stream Listener...');
      
      // Connect to database
      await connectToDatabase();
      
      // Get the profiles collection
      const profilesCollection = await getProfilesCollection();
      
      // Create change stream
      this.changeStream = profilesCollection.watch([
        {
          $match: {
            $or: [
              { operationType: 'insert' }, // New user created
              { operationType: 'update' }  // User profile updated
            ]
          }
        }
      ]);
      
      this.isRunning = true;
      console.log('✅ Change stream listener started successfully');
      
      // Listen for changes
      this.changeStream.on('change', (change) => {
        this.handleChange(change);
      });
      
      this.changeStream.on('error', (error) => {
        console.error('❌ Change stream error:', error);
        this.handleError(error);
      });
      
      this.changeStream.on('close', () => {
        console.log('🔌 Change stream closed');
        this.isRunning = false;
      });
      
    } catch (error) {
      console.error('❌ Failed to start change stream listener:', error);
      throw error;
    }
  }

  /**
   * Handle change events from MongoDB
   * @param {Object} change - Change event from MongoDB
   */
  async handleChange(change) {
    try {
      const { operationType, fullDocument, documentKey } = change;
      const userId = documentKey._id.toString();
      
      console.log(`📝 Change detected: ${operationType} for user ${userId}`);
      
      // Skip if we've already processed this user recently
      if (this.processedUsers.has(userId)) {
        console.log(`⏭️ Skipping user ${userId} - already processed recently`);
        return;
      }
      
      // Add to processed set
      this.processedUsers.add(userId);
      
      // Remove from processed set after 5 minutes to allow reprocessing
      setTimeout(() => {
        this.processedUsers.delete(userId);
      }, 5 * 60 * 1000);
      
      if (operationType === 'insert') {
        console.log(`🆕 New user created: ${userId}`);
        await this.handleNewUser(userId, fullDocument);
      } else if (operationType === 'update') {
        console.log(`🔄 User profile updated: ${userId}`);
        await this.handleUserUpdate(userId, fullDocument);
      }
      
    } catch (error) {
      console.error('❌ Error handling change event:', error);
      await this.notifyError('Change Event Processing Error', error);
    }
  }

  /**
   * Handle new user creation
   * @param {string} userId - User ID
   * @param {Object} userDocument - Full user document
   */
  async handleNewUser(userId, userDocument) {
    try {
      console.log(`🎯 Processing new user: ${userId}`);
      
      // Wait a bit to ensure the document is fully saved
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Match jobs for the new user
      const result = await matchJobsForUser(userId);
      
      if (result.totalMatches > 0) {
        console.log(`✅ New user ${userId} processed: ${result.totalMatches} job recommendations`);
        await this.notifySuccess('New User Job Matching', {
          userId,
          totalMatches: result.totalMatches,
          excellentMatches: result.excellentMatches,
          goodMatches: result.goodMatches,
          averageScore: result.averageScore
        });
      } else {
        console.log(`⚠️ New user ${userId} processed but no job matches found`);
      }
      
    } catch (error) {
      console.error(`❌ Error processing new user ${userId}:`, error);
      await this.notifyError(`New User Processing Error - ${userId}`, error);
    }
  }

  /**
   * Handle user profile update
   * @param {string} userId - User ID
   * @param {Object} userDocument - Updated user document
   */
  async handleUserUpdate(userId, userDocument) {
    try {
      console.log(`🔄 Processing user update: ${userId}`);
      
      // Check if the update includes skills or profile data
      const hasSkillsUpdate = this.hasSkillsUpdate(userDocument);
      
      if (hasSkillsUpdate) {
        console.log(`🎯 Skills updated for user ${userId}, reprocessing job matches`);
        
        // Wait a bit to ensure the document is fully updated
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Re-match jobs for the updated user
        const result = await matchJobsForUser(userId);
        
        if (result.totalMatches > 0) {
          console.log(`✅ User ${userId} updated: ${result.totalMatches} job recommendations`);
          await this.notifySuccess('User Profile Update - Job Matching', {
            userId,
            totalMatches: result.totalMatches,
            excellentMatches: result.excellentMatches,
            goodMatches: result.goodMatches,
            averageScore: result.averageScore
          });
        } else {
          console.log(`⚠️ User ${userId} updated but no job matches found`);
        }
      } else {
        console.log(`⏭️ User ${userId} updated but no skills changes detected`);
      }
      
    } catch (error) {
      console.error(`❌ Error processing user update ${userId}:`, error);
      await this.notifyError(`User Update Processing Error - ${userId}`, error);
    }
  }

  /**
   * Check if the user document has skills-related updates
   * @param {Object} userDocument - User document
   * @returns {boolean} True if skills were updated
   */
  hasSkillsUpdate(userDocument) {
    if (!userDocument) return false;
    
    // Check if profileData.skills exists and has content
    const hasProfileSkills = userDocument.profileData?.skills?.length > 0;
    
    // Check if resumeData.skills exists and has content
    const hasResumeSkills = userDocument.resumeData?.skills?.length > 0;
    
    return hasProfileSkills || hasResumeSkills;
  }

  /**
   * Handle change stream errors
   * @param {Error} error - Error object
   */
  async handleError(error) {
    console.error('❌ Change stream error occurred:', error);
    
    // Attempt to restart the change stream
    if (this.isRunning) {
      console.log('🔄 Attempting to restart change stream...');
      setTimeout(() => {
        this.restart();
      }, 5000);
    }
    
    await this.notifyError('Change Stream Error', error);
  }

  /**
   * Restart the change stream
   */
  async restart() {
    try {
      console.log('🔄 Restarting change stream...');
      await this.stop();
      await this.start();
    } catch (error) {
      console.error('❌ Failed to restart change stream:', error);
    }
  }

  /**
   * Stop the change stream listener
   */
  async stop() {
    try {
      if (this.changeStream) {
        await this.changeStream.close();
        this.changeStream = null;
      }
      this.isRunning = false;
      console.log('🛑 Change stream listener stopped');
    } catch (error) {
      console.error('❌ Error stopping change stream:', error);
    }
  }

  /**
   * Send success notification
   * @param {string} subject - Email subject
   * @param {Object} data - Data to include in notification
   */
  async notifySuccess(subject, data) {
    const emailHTML = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #28a745;">✅ ${subject}</h2>
      <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
      
      <h3 style="color: #007bff;">📊 Results</h3>
      <ul>
        <li><strong>User ID:</strong> ${data.userId}</li>
        <li><strong>Total Matches:</strong> ${data.totalMatches}</li>
        <li><strong>Excellent Matches:</strong> ${data.excellentMatches}</li>
        <li><strong>Good Matches:</strong> ${data.goodMatches}</li>
        <li><strong>Average Score:</strong> ${data.averageScore}%</li>
      </ul>
      
      <p style="color: #6c757d; font-size: 0.9em;">
        💾 Job recommendations have been saved to the database.
      </p>
    </div>`;

    const mailOptions = {
      from: config.notification.email.user,
      to: config.notification.email.recipients.join(', '),
      subject: `✅ ${subject} - ${data.totalMatches} matches found`,
      html: emailHTML
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('📧 Success notification sent');
    } catch (error) {
      console.error('❌ Failed to send success notification:', error);
    }
  }

  /**
   * Send error notification
   * @param {string} subject - Email subject
   * @param {Error} error - Error object
   */
  async notifyError(subject, error) {
    const emailHTML = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc3545;">❌ ${subject}</h2>
      <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
      
      <h3 style="color: #dc3545;">Error Details</h3>
      <pre style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto;">
${error.message}
${error.stack || ''}
      </pre>
    </div>`;

    const mailOptions = {
      from: config.notification.email.user,
      to: config.notification.email.recipients.join(', '),
      subject: `❌ ${subject}`,
      html: emailHTML
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('📧 Error notification sent');
    } catch (emailError) {
      console.error('❌ Failed to send error notification:', emailError);
    }
  }

  /**
   * Get listener status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      processedUsersCount: this.processedUsers.size,
      processedUsers: Array.from(this.processedUsers)
    };
  }
}

export default ChangeStreamListener;
