using {hpbuysell.mdm.usermgmt as db} from '../db/hpbuysellmdmusermgmt-model';


service UserManagementService @(path: '/user-management') {
    entity Users              as projection on db.Users;
    entity PartnerAssignments as projection on db.PartnerAssignments
        actions {
            action addProjects(projectIds: array of String)    returns array of ProjectAssignments;
            action removeProjects(projectIds: array of String) returns Boolean;
        };
    entity ProjectAssignments as projection on db.ProjectAssignments;

    @readonly
    entity ChangeLogs         as projection on db.ChangeLogs;
    // Read-only master/reference data - Value Help sources (Section 4.6-4.9)

    @readonly
    entity CustomerMaster     as projection on db.CustomerMaster where status = 'A';

    @readonly
    entity SupplierMaster     as projection on db.SupplierMaster where status = 'A';

    @readonly
    entity ProjectMaster      as projection on db.ProjectMaster where status = 'A';

    function searchUsers(searchTerm: String) returns array of Users;
}
