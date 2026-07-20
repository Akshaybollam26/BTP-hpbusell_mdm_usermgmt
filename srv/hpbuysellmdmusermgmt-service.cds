using {hpbuysell.mdm.usermgmt as db} from '../db/hpbuysellmdmusermgmt-model';


service UserManagementService @(path: '/user-management') {
    @odata.draft.enabled
    @(Capabilities: {
        InsertRestrictions: {Insertable: true},
        DeleteRestrictions: {Deletable: true},
        UpdateRestrictions: {Updatable: true}
    })
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
    entity CustomerMaster     as projection on db.CustomerMaster
                                 where
                                     status = 'A';

    @readonly
    entity SupplierMaster     as projection on db.SupplierMaster
                                 where
                                     status = 'A';

    @readonly
    entity ProjectMaster      as projection on db.ProjectMaster
                                 where
                                     status = 'A';

    function searchUsers(searchTerm: String)           returns array of Users;
    function getUnassignedCustomers(userEmail: String) returns array of CustomerMaster;
    function getUnassignedSuppliers(userEmail: String) returns array of SupplierMaster;
    function findSelectedProjects(partnerId: String)   returns array of ProjectMaster;
}
