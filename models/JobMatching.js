import mongoose from 'mongoose';

const jobMatchingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  recommendations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  }],
  updatedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true // This will automatically add createdAt and updatedAt fields
});

// Compound index for efficient querying by user and update time
jobMatchingSchema.index({ userId: 1, updatedAt: -1 });

// Ensure one job matching record per user
jobMatchingSchema.index({ userId: 1 }, { unique: true });

export default mongoose.model('JobMatching', jobMatchingSchema);
