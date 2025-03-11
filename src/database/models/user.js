const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    accountAge: {
        type: Date,
        required: true
    },
    isVerified: {
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model('User', userSchema);