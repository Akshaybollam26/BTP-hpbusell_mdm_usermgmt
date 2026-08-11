using {
    hpbuysell.mdm.usermgmt.Users,
    hpbuysell.mdm.usermgmt.UserGroups,
    hpbuysell.mdm.usermgmt.PartnerAssignments,
    hpbuysell.mdm.usermgmt.ProjectAssignments
} from './hpbuysellmdmusermgmt-model';

/**
 * Users
 *
 * email is used as the human-readable object identifier.
 *
 * Only business fields are tracked.
 * managed fields createdAt, createdBy, modifiedAt and modifiedBy
 * are intentionally not annotated.
 */
annotate Users with @changelog: [email] {
    email              @changelog;
    firstName          @changelog;
    lastName           @changelog;
    displayName        @changelog;
    userName           @changelog;
    active             @changelog;
    userType           @changelog;
    locale             @changelog;
    preferredLanguage  @changelog;
    timeZone           @changelog;
    userGroupIndicator @changelog;
};

/**
 * IAS SCIM groups.
 *
 * groupName is the readable identifier shown in Change History.
 */
annotate UserGroups with @changelog: [groupName] {
    groupId   @changelog;
    groupName @changelog;
};

/**
 * Customer and supplier assignments.
 *
 * Both the type and ID identify the assignment.
 */
annotate PartnerAssignments
    with @changelog: [partnerType, partnerId] {
        partnerType @changelog;
        partnerId   @changelog;
        partnerName @changelog;
};

/**
 * Project assignments.
 *
 * projectId identifies the project assignment.
 */
annotate ProjectAssignments with @changelog: [projectId] {
    projectId   @changelog;
    projectName @changelog;
};