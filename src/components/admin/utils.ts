
// Helper function to map database roles to frontend roles
export const mapDatabaseRoleToFrontend = (dbRole: string): 'client' | 'commercial' | 'admin' => {
  switch (dbRole) {
    case 'kumulus_personnel':
      return 'commercial'; // Sales/personnel - no admin access
    case 'kumulus_admin':
      return 'admin'; // True admin access
    case 'client':
      return 'client';
    default:
      return 'client';
  }
};

// Helper function to map frontend roles to database roles for invitations
export const mapFrontendRoleToDatabase = (frontendRole: 'client' | 'commercial' | 'admin'): 'client' | 'kumulus_personnel' | 'kumulus_admin' => {
  switch (frontendRole) {
    case 'commercial':
      return 'kumulus_personnel'; // Sales/personnel role
    case 'admin':
      return 'kumulus_admin'; // True admin role
    case 'client':
      return 'client';
    default:
      return 'client';
  }
};
