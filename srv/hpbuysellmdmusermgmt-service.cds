using {hpbuysell.mdm.usermgmt as db} from '../db/hpbuysellmdmusermgmt-model';
 
 
service UserManagementService 
@(path: '/user-management')
//@(require: 'authenticated-user')
 {
    @odata.singleton  @cds.persistence.skip
 
    entity auth {

        key ID        : String;
            canCreate : Boolean;
            canUpdate : Boolean;
            canDelete : Boolean;
    }

    @restrict: [
        {
            grant: 'READ',
            to   : [
                'UsermgmtViewer',
                'UsermgmtManage'
            ]
        },
        {
            grant: [
                'CREATE',
                'UPDATE',
                'DELETE'
            ],
            to   : 'UsermgmtManage'
        }
 
    ]
 
    @odata.draft.enabled
    @(Capabilities: {
        InsertRestrictions: {Insertable: true},
        DeleteRestrictions: {Deletable: true},
        UpdateRestrictions: {Updatable: true}
    })
    entity Users              as projection on db.Users;
 
    entity PartnerAssignments as projection on db.PartnerAssignments;
 
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
 
    entity BusinessPartnerVH  as
            select from CustomerMaster {
                key customerId   as partnerId,
                    customerId   as customerId,
                    cast(
                        null as String(10)
                    )            as supplierId,
                    customerName as partnerName,
                    cast(
                        'C' as String(1)
                    )            as partnerType,
                    cast(
                        null as String(241)
                    )            as userEmail
            }

        union all

            select from SupplierMaster {
                key supplierId   as partnerId,
                    cast(
                        null as String(10)
                    )            as customerId,
                    supplierId   as supplierId,
                    supplierName as partnerName,
                    cast(
                        'S' as String(1)
                    )            as partnerType,
                    cast(
                        null as String(241)
                    )            as userEmail
            };
    entity UserGroups as projection on db.UserGroups;
    function searchUsers(searchTerm: String)                                                       returns array of Users;
    function getUnassignedCustomers(userEmail: String, isActiveEntity: Boolean)                    returns array of CustomerMaster;
    function getUnassignedSuppliers(userEmail: String, isActiveEntity: Boolean)                    returns array of SupplierMaster;
    // function findSelectedProjects(userEmail: String, partnerId: String)
    function findSelectedProjects(partnerID: UUID, isActiveEntity: Boolean)                        returns array of ProjectMaster;

    action   addProjects(partnerID: UUID, isActiveEntity: Boolean, projectIds: array of String)    returns array of ProjectAssignments;
    action   removeProjects(partnerID: UUID, isActiveEntity: Boolean, projectIds: array of String) returns Boolean;
    action syncusers(); 

}
