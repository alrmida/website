
// Helper function to map database roles to frontend roles
export const mapDatabaseRoleToFrontend = (dbRole: string): 'client' | 'commercial' | 'admin' => {
  switch (dbRole) {
    case 'kumulus_personnel':
      return 'commercial'; // We'll handle admin distinction separately
    case 'client':
      return 'client';
    default:
      return 'client';
  }
};

// Helper function to map frontend roles to database roles for invitations
export const mapFrontendRoleToDatabase = (frontendRole: 'client' | 'commercial' | 'admin'): 'client' | 'kumulus_personnel' => {
  switch (frontendRole) {
    case 'commercial':
    case 'admin':
      return 'kumulus_personnel'; // Both map to kumulus_personnel in database
    case 'client':
      return 'client';
    default:
      return 'client';
  }
};
