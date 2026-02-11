# Profile Settings Setup Guide

## Features Added
✅ Comprehensive profile settings page with all signup fields
✅ Profile photo upload functionality
✅ Real-time avatar display in sidebar and header
✅ Support for both student and mentor profiles
✅ Image validation (type and size)

## Setup Instructions

### 1. Create Storage Bucket in Supabase

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `storage-schema.sql`
4. Click **Run** to execute the SQL commands

This will:
- Create a public `profiles` storage bucket for profile images
- Set up Row Level Security (RLS) policies for image uploads

### 2. Verify Storage Bucket

1. In Supabase Dashboard, go to **Storage**
2. You should see a `profiles` bucket
3. Click on it to verify it's accessible

### 3. Test the Features

1. Start your app: `npm run dev`
2. Login to your account
3. Click the **Settings** button in the sidebar or dropdown menu
4. Update your profile information:
   - Upload a profile picture (click the camera icon)
   - Update your name, phone, and other details
   - Click **Save Changes**

### 4. Available Profile Fields

**For Students:**
- Profile Photo
- Full Name
- Email (read-only)
- Phone Number
- Class
- Age
- Course
- Username

**For Mentors:**
- Profile Photo
- Full Name
- Email (read-only)
- Phone Number
- Profession
- Experience

## Components Modified

- **Settings.tsx** (NEW): Complete settings page with all profile fields and image upload
- **UserProfile.tsx** (UPDATED): Added Settings button and avatar display
- **storage-schema.sql** (NEW): SQL script to create storage bucket and policies

## Image Upload Details

- **Supported formats**: All image types (jpg, png, gif, etc.)
- **Max file size**: 2MB
- **Storage location**: Supabase Storage bucket `profiles/avatars/`
- **Access**: Public URLs (images are publicly accessible)

## Troubleshooting

### Issue: "Failed to upload image"
**Solution**: Make sure you've run the `storage-schema.sql` in Supabase SQL Editor

### Issue: "Storage bucket not found"
**Solution**: 
1. Go to Supabase Dashboard → Storage
2. Manually create a bucket named `profiles`
3. Make it public
4. Run the RLS policies from `storage-schema.sql`

### Issue: "Failed to load profile"
**Solution**: Ensure your `user_profiles` table exists and has the correct columns (run `database-schema.sql`)

## Next Steps

After setting up, users can:
1. Update their profile information anytime from Settings
2. Upload and change their profile picture
3. See their avatar displayed throughout the app
4. All changes are saved to Supabase database

## Database Tables Used

- `user_profiles`: Stores all user profile information
- `storage.objects`: Stores profile images
- `storage.buckets`: Configuration for the profiles bucket
