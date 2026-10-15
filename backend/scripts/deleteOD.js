const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');

mongoose.connect('mongodb://127.0.0.1:27017/scgrs').then(async () => {
  const result = await Complaint.deleteMany({
    $or: [
      { category: 'OD Form Issue' },
      { title: /OD/i },
      { description: /OD form/i }
    ]
  });
  console.log('Deleted OD complaints:', result.deletedCount);
  mongoose.disconnect();
}).catch(err => {
  console.error(err.message);
  process.exit(1);
});
