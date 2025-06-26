import { Suggest } from "inferred-types";
import { Event } from "./base/workflows/event"


export type BranchProtectionRule = Suggest<
    | "created"
    | "edited"
    | "deleted"
>;
export type CheckRunType = Suggest<
    | "created"
    | "rerequested"
    | "completed"
    | "requested_action"
>;

export type DiscussionType = Suggest<
    | "created"
    | "edited"
    | "deleted"
    | "transferred"
    | "pinned"
    | "unpinned"
    | "labeled"
    | "unlabeled"
    | "locked"
    | "unlocked"
    | "category_changed"
    | "answered"
    | "unanswered"  
>;

export type DiscussionCommentType = Suggest<
    | "created"
    | "edited"
    | "deleted"
>;

export type IssueCommentType = Suggest<
    | "created"
    | "edited"
    | "deleted"
>;

export type IssueType = Suggest<
    | "opened"
    | "edited"
    | "deleted"
    | "transferred"
    | "pinned"
    | "unpinned"
    | "closed"
    | "reopened"
    | "assigned"
    | "unassigned"
    | "labeled"
    | "unlabeled"
    | "locked"
    | "unlocked"
    | "milestoned"
    | "demilestoned"
    | "typed"
    | "untyped"
>;

export type LabelType = Suggest<
    | "created"
    | "edited"
    | "deleted"
>;

export type MilestoneType = Suggest<
    | "created"
    | "closed"
    | "opened"
    | "edited"
    | "deleted"
>;

export type PullRequestType = Suggest<
    | "assigned"
    | "unassigned"
    | "labeled"
    | "unlabeled"
    | "opened"
    | "edited"
    | "closed"
    | "reopened"
    | "synchronize"
    | "converted_to_draft"
    | "locked"
    | "unlocked"
    | "enqueued"
    | "dequeued"
    | "milestoned"
    | "demilestoned"
    | "ready_for_review"
    | "review_requested"
    | "review_request_removed"
    | "auto_merge_enabled"
    | "auto_merge_disabled"
>;

export type Branch = Suggest<
    | "main"
    | "master"
    | "releases/**"
    | "develop"
    | "feature/**"
>

export type PathSuggest = Suggest<
    | "**.js"
    | "**.ts"
    | "**.py"
    | "**.rs"
>;

export type PullRequestReviewType = Suggest<
    | "submitted"
    | "edited"
    | "dismissed"
>;

export type PullRequestReviewCommentType = Suggest<
    | "created"
    | "edited"
    | "deleted"
>;

export type PullRequestTarget = Suggest<
    | "assigned"
    | "unassigned"
    | "labeled"
    | "unlabeled"
    | "opened"
    | "edited"
    | "closed"
    | "reopened"
    | "synchronize"
    | "converted_to_draft"
    | "ready_for_review"
    | "locked"
    | "unlocked"
    | "review_requested"
    | "review_request_removed"
    | "auto_merge_enabled"
    | "auto_merge_disabled"
>;

export type TagSuggest = Suggest<
    | "v1.**"
    | "v1.1.*"
>;

export type RegistryPackageType = Suggest<
    | "published"
    | "updated"
>;

export type ReleaseType = Suggest<
    | "published"
    | "unpublished"
    | "created"
    | "edited"
    | "deleted"
    | "prerelease"
    | "released"
>;

export type WorkflowRunType = Suggest<
    | "completed"
    | "requested"
    | "in_progress"
>

type EventLookup = {
    branch_protection_rule: { types: BranchProtectionRule | BranchProtectionRule[] };
    check_run: { types: CheckRunType | CheckRunType[] };
    check_suite: { types: Suggest<"completed"> | Suggest<"completed">[] };
    create: {},
    delete: {},
    deployment: {},
    deployment_status: {},
    discussion: { types: DiscussionType | DiscussionType[]},
    discussion_comment: { types: DiscussionCommentType | DiscussionCommentType[]},
    fork: {},
    gollum: {},
    issue_comment: { types: IssueCommentType | IssueCommentType[] },
    issues: { types: IssueType | IssueType[] },
    label: { types: LabelType | LabelType[] },
    merge_group: { types: Suggest<"checked_requested"> | Suggest<"checked_requested">[] },
    milestones: { types: MilestoneType | MilestoneType[] },
    page_build: {},
    public: {},

    pull_request: { 
        types: PullRequestType | PullRequestType[]; 
        branches?: Branch | Branch[]; 
        paths?: string[]
    },
    pull_request_review: { types: PullRequestReviewType | PullRequestReviewType[] },
    pull_request_review_comment: { types: PullRequestReviewCommentType | PullRequestReviewCommentType[] },
    pull_request_target: { 
        types: PullRequestTarget | PullRequestTarget[];
        branches?: Branch | Branch[];
        paths?: PathSuggest | PathSuggest[];
    };
    push: {
        branches?: Branch | Branch[];
        paths?: PathSuggest | PathSuggest[];
        tags?: TagSuggest | TagSuggest[];
    }
    registry_package: { types: RegistryPackageType | RegistryPackageType[] };
    release: { types: ReleaseType | ReleaseType[] };
    repository_dispatch: { types: string | string[] };
    schedule: {};
    status: {};
    watch: { types: Suggest<"started"> | Suggest<"started">[] };
    workflow_call: {};
    workflow_dispatch: {
        inputs?: GhaInputs;
        outputs?: GhaOutputs;
    };
    workflow_run: { 
        types: WorkflowRunType | WorkflowRunType[];
        workflows?: string | string[];
        branches?: Branch | Branch[];
        "branches-ignore"?: Branch | Branch[];
    }
}


export type GhaWorkflow = <T extends string>(name: T) => {
    on<
        TEvent extends Suggest<Event>,
        TType extends TEvent extends keyof EventLookup ? EventLookup[TEvent] : unknown
    >(
        evt: TEvent,
        type: TType
    )
}

// const a = null as unknown as GhaWorkflow;

// a("foo")
//     .on("pull_request", { types: "assigned", branches: "main" })

