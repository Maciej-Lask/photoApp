const Photo = require('../models/photo.model');
const Voter = require('../models/Voter.model');
const path = require('path');
const lodash = require('lodash');  
const requestIp = require('request-ip');
/****** SUBMIT PHOTO ********/


exports.add = async (req, res) => {
  try {
    const { title, author, email } = req.fields;
    const file = req.files.file;

    // Check for required fields
    if (!title || !author || !email || !file) {
      throw new Error('Wrong input!');
    }

    const escapedTitle = lodash.escape(title);
    const escapedAuthor = lodash.escape(author);
    const escapedEmail = lodash.escape(email);

    // Check title and author length
    const maxTitleLength = 25;
    const maxAuthorLength = 50;
    if (title.length > maxTitleLength || author.length > maxAuthorLength) {
      throw new Error(
        `Title must be up to ${maxTitleLength} characters long, and author must be up to ${maxAuthorLength} characters long.`
      );
    }

    // Check file extension
    const allowedExtensions = ['.gif', '.jpg', '.jpeg', '.png'];
    const fileExtension = path.extname(file.name).toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      throw new Error(
        'Wrong file format! Only gif, jpg, or png files are allowed.'
      );
    }

    const fileName = file.path.split('/').slice(-1)[0];
    const newPhoto = new Photo({
      title: escapedTitle,
      author: escapedAuthor,
      email: escapedEmail,
      src: fileName,
      votes: 0,
    });
    await newPhoto.save();
    
    res.json(newPhoto);
  } catch (err) {
    res.status(500).json(err);
  }
};


/****** LOAD ALL PHOTOS ********/

exports.loadAll = async (req, res) => {
  try {
    res.json(await Photo.find());
  } catch (err) {
    res.status(500).json(err);
  }
};

/****** VOTE FOR PHOTO ********/

exports.vote = async (req, res) => {
  try {
    const photoId = req.params.id;

    const voterIp = requestIp.getClientIp(req);

    const existingVoter = await Voter.findOne({ user: voterIp });

    if (existingVoter) {
      if (existingVoter.votes.includes(photoId)) {
        res
          .status(500)
          .json({ message: 'You have already voted for this photo.' });
      } else {
        existingVoter.votes.push(photoId);
        existingVoter.save();

        const photoToUpdate = await Photo.findOne({ _id: photoId });
        if (!photoToUpdate)
          res.status(404).json({ message: 'Photo not found' });
        else {
          photoToUpdate.votes++;
          photoToUpdate.save();
          res.json({ message: 'Vote added successfully.' });
        }
      }
    } else {
      const newVoter = new Voter({
        user: voterIp,
        votes: [photoId], 
      });
      await newVoter.save();

      const photoToUpdate = await Photo.findOne({ _id: photoId });
      if (!photoToUpdate) res.status(404).json({ message: 'Photo not found' });
      else {
        photoToUpdate.votes++;
        photoToUpdate.save();
        res.json({ message: 'Vote added successfully.' });
      }
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
