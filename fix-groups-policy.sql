-- =============================================
--  Fix Groups RLS Policy
--  Run this in your Supabase SQL Editor
-- =============================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can view groups they created" ON groups;
DROP POLICY IF EXISTS "Users can view groups they are members of" ON groups;
DROP POLICY IF EXISTS "Users can view their groups" ON groups;

-- Create SECURITY DEFINER function to check group membership (bypasses RLS)
CREATE OR REPLACE FUNCTION is_group_member(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM group_members
        WHERE group_id = p_group_id
        AND user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new policy using the SECURITY DEFINER function to avoid recursion
CREATE POLICY "Users can view their groups" ON groups
    FOR SELECT USING (
        created_by = auth.uid() 
        OR 
        is_group_member(id, auth.uid())
    );

-- Verify the policy was created successfully
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'groups' AND policyname = 'Users can view their groups';
