-- =============================================
--  Fix Group Members Visibility
--  Run this in your Supabase SQL Editor
--  
--  ISSUE: Regular group members can't see other members (including admin)
--  FIX: Allow all members of a group to see all other members in that group
-- =============================================

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Members can view other members" ON group_members;

-- Create a SECURITY DEFINER function to check if user is in the same group
-- This bypasses RLS to avoid recursion
CREATE OR REPLACE FUNCTION is_member_of_group(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM group_members
        WHERE group_id = p_group_id
        AND user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new policy: Users can view ALL members of groups they belong to
CREATE POLICY "Members can view all group members" ON group_members
    FOR SELECT USING (
        -- Use SECURITY DEFINER function to check if current user is a member of this group
        is_member_of_group(group_id, auth.uid())
    );

-- Verify the policy was created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'group_members';
