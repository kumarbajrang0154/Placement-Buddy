import User from '../models/User.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');
// Prefer the enhanced ATS service if it exists, otherwise fall back to the original
let pythonScript = path.join(projectRoot, 'ats_service_enhanced.py');
if (!fs.existsSync(pythonScript)) {
  pythonScript = path.join(projectRoot, 'ats_service.py');
}

// Determine python executable inside virtual environment (cross-platform)
const unixPython = path.join(projectRoot, 'venv', 'bin', 'python');
const windowsPython = path.join(projectRoot, 'venv', 'Scripts', 'python.exe');
let venvPython;
if (fs.existsSync(windowsPython)) {
  venvPython = windowsPython;
} else if (fs.existsSync(unixPython)) {
  venvPython = unixPython;
} else {
  // if venv not found, we'll try to use system python but warn the user
  console.warn('⚠️  Python virtual environment not found. Falling back to system python.');
  venvPython = 'python';
}

// Ensure uploads directory exists
const uploadsDir = path.join(projectRoot, 'server/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export const updateProfile = async (req, res) => {
  try {
    const profileData = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Helper that returns value only if provided (including empty array/string)
    const provided = (key) => Object.prototype.hasOwnProperty.call(profileData, key);

    // Merge updated fields without wiping unspecified data
    user.profile.year = provided('year') ? profileData.year : user.profile.year;
    user.profile.branch = provided('branch') ? profileData.branch : user.profile.branch;
    user.profile.targetRole = provided('targetRole') ? profileData.targetRole : user.profile.targetRole;
    user.profile.skills = provided('skills') ? profileData.skills : user.profile.skills;
    user.profile.hoursPerWeek = provided('hoursPerWeek') ? profileData.hoursPerWeek : user.profile.hoursPerWeek;

    user.profile.phone = provided('phone') ? profileData.phone : user.profile.phone;
    user.profile.location = provided('location') ? profileData.location : user.profile.location;
    user.profile.linkedin = provided('linkedin') ? profileData.linkedin : user.profile.linkedin;
    user.profile.github = provided('github') ? profileData.github : user.profile.github;
    user.profile.portfolio = provided('portfolio') ? profileData.portfolio : user.profile.portfolio;

    user.profile.education = provided('education') ? profileData.education : (user.profile.education || []);
    user.profile.experience = provided('experience') ? profileData.experience : (user.profile.experience || []);
    user.profile.projects = provided('projects') ? profileData.projects : (user.profile.projects || []);
    user.profile.certifications = provided('certifications') ? profileData.certifications : (user.profile.certifications || []);
    user.profile.achievements = provided('achievements') ? profileData.achievements : (user.profile.achievements || []);
    user.profile.languages = provided('languages') ? profileData.languages : (user.profile.languages || []);

    // ATS Data
    user.profile.atsScore = provided('atsScore') ? profileData.atsScore : user.profile.atsScore;
    user.profile.atsIssues = provided('atsIssues') ? profileData.atsIssues : (user.profile.atsIssues || []);
    user.profile.atsTips = provided('atsTips') ? profileData.atsTips : (user.profile.atsTips || []);

    await user.save();

    // Return updated user data with profile completeness
    const profileCompleteness = user.getProfileCompleteness();

    res.json({
      message: 'Profile updated successfully',
      profile: user.profile,
      profileCompleteness,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        college: user.college,
        profile: user.profile,
        readinessScore: user.readinessScore,
        daysActive: user.daysActive
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getProfile = async (req, res) => {
  try {
    const userId = req.params.userId || req.userId;
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        college: user.college,
        profile: user.profile,
        readinessScore: user.readinessScore,
        daysActive: user.daysActive
      },
      profileCompleteness: user.getProfileCompleteness()
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No resume file uploaded.' });
    }

    const filePath = req.file.path;
    
    // Validate file type
    if (!req.file.originalname.toLowerCase().endsWith('.pdf')) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'Only PDF files are supported.' });
    }

    console.log('📄 Processing resume:', req.file.originalname);
    console.log('📍 File path:', filePath);

    try {
      // Call Python ATS service
      const command = `${venvPython} ${pythonScript} "${filePath}"`;
      console.log('🐍 Executing:', command);
      
      const { stdout, stderr } = await execAsync(command, {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        env: {
          ...process.env,
          GROQ_API_KEY: process.env.GROQ_API_KEY
        }
      });

      // Clean up temp file
      fs.unlinkSync(filePath);

      if (stderr) {
        console.log('Python stderr:', stderr);
      }

      if (!stdout || stdout.trim().length === 0) {
        throw new Error('No output from Python ATS service');
      }

      const atsResult = JSON.parse(stdout);
      
      if (atsResult.error) {
        throw new Error(atsResult.error);
      }

      console.log('✅ ATS Analysis complete:', atsResult);

      return res.json({
        success: true,
        data: atsResult
      });

    } catch (error) {
      // Clean up temp file on error
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      throw error;
    }

  } catch (error) {
    console.error('❌ Resume upload/parsing error:', error);
    
    // Clean up temp file if it still exists
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: error.message || 'Internal server error processing the resume' 
    });
  }
};
