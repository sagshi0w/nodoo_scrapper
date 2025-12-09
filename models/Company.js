import mongoose from 'mongoose';

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  isActivelyHiring: {
    type: Boolean,
    default: false
  },
  numberOfJobs: {
    type: Number,
    default: 0,
    min: 0
  },
  logo: {
    type: String,
    trim: true,
    required: false,
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional field
        // Validate file extension: .webp or .png
        return /\.(webp|png)$/i.test(v);
      },
      message: 'Logo must be a .webp or .png file'
    }
  },
  locations: [{
    address: {
      type: String,
      required: true,
      trim: true
    },
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180
    },
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        required: false // Optional for backward compatibility
      }
    },
    isPrimary: {
      type: Boolean,
      default: false
    },
    locationName: {
      type: String,
      trim: true,
      required: false // Optional field for branch names, office types, etc.
    }
  }]
}, {
  timestamps: true // This automatically adds createdAt and updatedAt fields
});

// Create compound index for location-based queries on nested locations
companySchema.index({ 'locations.latitude': 1, 'locations.longitude': 1 });

// Create 2dsphere index for geospatial queries ($near, $geoWithin, etc.)
companySchema.index({ 'locations.coordinates': '2dsphere' });

// Create text index for search functionality
companySchema.index({
  name: 'text',
  'locations.address': 'text',
  'locations.locationName': 'text'
});

// Create index for primary location queries
companySchema.index({ 'locations.isPrimary': 1 });

// Pre-save middleware to automatically populate GeoJSON coordinates from lat/lng
companySchema.pre('save', function(next) {
  if (this.locations && Array.isArray(this.locations)) {
    this.locations.forEach(location => {
      // Populate GeoJSON coordinates if latitude/longitude exist
      if (location.latitude !== undefined && location.longitude !== undefined) {
        if (!location.coordinates || !location.coordinates.coordinates) {
          location.coordinates = {
            type: 'Point',
            coordinates: [location.longitude, location.latitude] // GeoJSON format: [lng, lat]
          };
        }
      }
    });
  }
  next();
});

// Note: name index is already created by 'index: true' in the schema definition above

export default mongoose.model('Company', companySchema);

