import {
  type ContainmentGuidance,
  type ContainmentGuidanceRequest,
  type IntakeQuestionSet,
  type IssueTypeId,
  type RequestReviewExpectation,
  type RequestReviewNextStep,
  supportedIssueTypes,
} from '@handrix/shared-contracts';
import { Injectable } from '@nestjs/common';

const intakeQuestionSets: IntakeQuestionSet[] = [
  {
    issueTypeId: 'dripping-faucet',
    title: 'A few quick faucet details',
    questions: [
      {
        id: 'singleFixture',
        issueTypeId: 'dripping-faucet',
        prompt: 'Is the dripping coming from one faucet only?',
        helperText:
          'We use this to keep the request within the MVP plumbing scope.',
        responseType: 'boolean',
        required: true,
      },
      {
        id: 'shutoffAccessible',
        issueTypeId: 'dripping-faucet',
        prompt: 'Can you still reach the local shutoff valve for that fixture?',
        helperText:
          'This helps us understand how contained the issue is right now.',
        responseType: 'boolean',
        required: true,
      },
    ],
  },
  {
    issueTypeId: 'under-sink-leak',
    title: 'A few quick leak details',
    questions: [
      {
        id: 'containedToSink',
        issueTypeId: 'under-sink-leak',
        prompt: 'Is the leak staying under one sink cabinet?',
        helperText:
          'If water is spreading beyond one fixture, we route it differently.',
        responseType: 'boolean',
        required: true,
      },
      {
        id: 'activePooling',
        issueTypeId: 'under-sink-leak',
        prompt: 'Is water actively pooling right now?',
        helperText:
          'This helps us prioritize the request context for the next step.',
        responseType: 'boolean',
        required: true,
      },
    ],
  },
  {
    issueTypeId: 'clogged-toilet',
    title: 'A few quick toilet details',
    questions: [
      {
        id: 'singleToiletAffected',
        issueTypeId: 'clogged-toilet',
        prompt: 'Is only one toilet affected?',
        helperText:
          'We keep this MVP focused on contained small-plumbing issues.',
        responseType: 'boolean',
        required: true,
      },
      {
        id: 'backupBeyondToilet',
        issueTypeId: 'clogged-toilet',
        prompt: 'Is sewage backing up into another drain or tub?',
        helperText:
          'If it is, we need to route you to a recovery path instead.',
        responseType: 'boolean',
        required: true,
      },
    ],
  },
  {
    issueTypeId: 'slow-drain',
    title: 'A few quick drain details',
    questions: [
      {
        id: 'singleDrainAffected',
        issueTypeId: 'slow-drain',
        prompt: 'Is only one drain running slowly?',
        helperText:
          'Multiple affected drains can indicate a larger issue outside this flow.',
        responseType: 'boolean',
        required: true,
      },
      {
        id: 'standingWater',
        issueTypeId: 'slow-drain',
        prompt: 'Is water sitting for more than a few minutes after use?',
        helperText:
          'This helps us understand how urgent the blockage feels to you.',
        responseType: 'boolean',
        required: true,
      },
    ],
  },
  {
    issueTypeId: 'shower-bath-leak',
    title: 'A few quick bath or shower details',
    questions: [
      {
        id: 'containedToBathArea',
        issueTypeId: 'shower-bath-leak',
        prompt: 'Is the leak limited to the bath or shower area?',
        helperText:
          'If water is affecting other rooms or ceilings, we route it differently.',
        responseType: 'boolean',
        required: true,
      },
      {
        id: 'leakOnlyWhenRunning',
        issueTypeId: 'shower-bath-leak',
        prompt: 'Does the leak happen only when the tub or shower is running?',
        helperText: 'This helps narrow the likely scope before the next step.',
        responseType: 'boolean',
        required: true,
      },
    ],
  },
];

type ContainmentGuidanceTemplate = {
  issueTypeId: IssueTypeId;
  serviceable: {
    headline: string;
    intro: string;
    steps: ContainmentGuidance['steps'];
    reassurance: string;
  };
  outOfArea: {
    headline: string;
    intro: string;
    steps: ContainmentGuidance['steps'];
    warnings: ContainmentGuidance['warnings'];
    reassurance: string;
  };
  recovery: {
    headline: string;
    intro: string;
    steps: ContainmentGuidance['steps'];
    warnings: ContainmentGuidance['warnings'];
    reassurance: string;
  };
};

const containmentGuidanceTemplates: ContainmentGuidanceTemplate[] = [
  {
    issueTypeId: 'dripping-faucet',
    serviceable: {
      headline: 'Keep the fixture contained while we prepare the next step.',
      intro:
        'A small faucet drip is usually manageable for the moment when you keep water use limited and the area dry.',
      steps: [
        {
          title: 'Use the fixture as little as possible',
          detail:
            'Reducing water use lowers the chance that the drip worsens while you move through the request.',
        },
        {
          title: 'Place a towel or bowl under the drip',
          detail:
            'This helps protect the counter or cabinet area from steady moisture.',
        },
      ],
      reassurance:
        'You are taking the right first step. We will keep the next screen short and practical.',
    },
    outOfArea: {
      headline:
        'Keep the drip contained while we guide you to the safest fallback.',
      intro:
        'Your address appears outside the current Handrix service area, so the next step will focus on a clearer recovery path.',
      steps: [
        {
          title: 'Keep a towel or container under the leak',
          detail:
            'This can help reduce surface damage while you decide on the next action.',
        },
      ],
      warnings: [
        {
          title: 'If the drip becomes a steady flow',
          detail:
            'Treat it as a more urgent plumbing problem and use the safer fallback guidance instead of waiting.',
        },
      ],
      reassurance:
        'Even when we cannot continue with normal booking, we can still help you take the next best step.',
    },
    recovery: {
      headline: 'Please take a safer recovery step before continuing.',
      intro:
        'The details shared suggest this may be broader than the standard small-plumbing path, so containment comes first.',
      steps: [
        {
          title: 'Limit use of the affected fixture',
          detail:
            'Avoid running water through the fixture again until the situation is better contained.',
        },
      ],
      warnings: [
        {
          title: 'If water is reaching floors or walls',
          detail:
            'Move nearby items away from the area and prioritize damage control before continuing.',
        },
      ],
      reassurance:
        'You do not need to solve the plumbing diagnosis right now. We will keep the next decision simple.',
    },
  },
  {
    issueTypeId: 'under-sink-leak',
    serviceable: {
      headline: 'Keep the leak contained while we prepare the next step.',
      intro:
        'A contained under-sink leak is often safest when water use pauses and the cabinet area stays clear and dry.',
      steps: [
        {
          title: 'Avoid running that fixture for now',
          detail:
            'Pausing water use helps keep a contained cabinet leak from worsening while you continue.',
        },
        {
          title: 'Place a towel or shallow container under the leak',
          detail:
            'This can limit pooling and help you keep the area manageable for the moment.',
        },
      ],
      reassurance:
        'You have already shared the key details we need. The next step will stay focused and quick.',
    },
    outOfArea: {
      headline:
        'Contain the leak first while we move you toward a fallback path.',
      intro:
        'This request appears outside our current service area, so the next screen will focus on safer recovery options.',
      steps: [
        {
          title: 'Keep cabinet contents clear of the wet area',
          detail:
            'Moving nearby items can reduce damage while you review the next steps.',
        },
      ],
      warnings: [
        {
          title: 'If water is spreading beyond the cabinet',
          detail:
            'Treat this as a broader leak and prioritize protecting the surrounding floor or wall area.',
        },
      ],
      reassurance:
        'We will still keep the guidance practical and calm, even if the standard booking path changes.',
    },
    recovery: {
      headline: 'Please take a safer leak-control step before continuing.',
      intro:
        'The details suggest this leak may be broader than the normal intake path, so focus on limiting spread first.',
      steps: [
        {
          title: 'Stop using the affected sink for now',
          detail:
            'Additional water use can make a broader leak harder to manage.',
        },
      ],
      warnings: [
        {
          title: 'If water is actively spreading',
          detail:
            'Protect nearby flooring and move valuables away from the leak path before continuing.',
        },
      ],
      reassurance:
        'You are still making progress. We will point you to the clearest next option from here.',
    },
  },
  {
    issueTypeId: 'clogged-toilet',
    serviceable: {
      headline: 'Keep the toilet stable while we prepare the next step.',
      intro:
        'For a contained toilet issue, the safest move is to pause use and keep the area ready in case the water rises again.',
      steps: [
        {
          title: 'Do not flush again right now',
          detail:
            'Waiting helps reduce the chance of another rise or overflow before the next step.',
        },
        {
          title: 'Keep the floor area clear and dry',
          detail:
            'A towel nearby can help with minor splashing or cleanup if needed.',
        },
      ],
      reassurance:
        'You are doing the right things. The next screen will keep the request moving without extra guesswork.',
    },
    outOfArea: {
      headline: 'Pause use of the toilet while we move to a fallback path.',
      intro:
        'Your address appears outside the active service area, so we will guide you through the clearest next option instead of the standard booking path.',
      steps: [
        {
          title: 'Avoid flushing again',
          detail:
            'A second flush can make the situation harder to control while you decide on the next action.',
        },
      ],
      warnings: [
        {
          title: 'If water begins rising quickly',
          detail:
            'Stay clear of the bowl area and prioritize the fallback guidance immediately.',
        },
      ],
      reassurance:
        'Even outside the booking area, we can still help you take a calmer, safer next step.',
    },
    recovery: {
      headline: 'Please take a safer recovery step before continuing.',
      intro:
        'The details suggest this issue may fall outside the standard contained-toilet path, so immediate control matters most.',
      steps: [
        {
          title: 'Avoid flushing again',
          detail:
            'Another flush could force more water into the bowl or push the problem further through the line.',
        },
      ],
      warnings: [
        {
          title: 'If wastewater is rising',
          detail:
            'Move nearby items away from the area and avoid contact with the water while you follow the recovery path.',
        },
      ],
      reassurance:
        'You do not need to troubleshoot this alone. We will keep the next move clear and practical.',
    },
  },
  {
    issueTypeId: 'slow-drain',
    serviceable: {
      headline: 'Keep the water under control while we prepare the next step.',
      intro:
        'A slow drain is usually safest when water use stays light and the affected fixture gets a short pause.',
      steps: [
        {
          title: 'Stop using the fixture for now',
          detail:
            'Pausing water use helps keep a slow drain from backing up further while you continue.',
        },
        {
          title: 'Place a towel nearby',
          detail:
            'This can help with minor splashing or overflow if the drain suddenly slows more.',
        },
      ],
      reassurance:
        'You do not need to figure this out alone. We will keep the next step simple.',
    },
    outOfArea: {
      headline:
        'Keep the drain as stable as possible while we shift to a fallback path.',
      intro:
        'This address is outside the current service area, so the next step will focus on the clearest recovery option.',
      steps: [
        {
          title: 'Avoid running more water through that drain',
          detail:
            'Extra water can make a slow drain feel less predictable while you decide on the next action.',
        },
      ],
      warnings: [
        {
          title: 'If standing water rises',
          detail:
            'Pause here and follow the fallback guidance instead of continuing as though the issue were contained.',
        },
      ],
      reassurance:
        'We can still help you stay oriented, even if normal booking is not available for this address.',
    },
    recovery: {
      headline: 'Please take a safer recovery step before continuing.',
      intro:
        'The details you shared suggest this drain issue may be broader than the standard intake path, so containment comes first.',
      steps: [
        {
          title: 'Avoid using the affected drain',
          detail:
            'Keeping more water out of the line can reduce the chance of a messy backup.',
        },
      ],
      warnings: [
        {
          title: 'If water starts backing up into another fixture',
          detail:
            'Treat that as a stronger warning sign and prioritize the recovery path immediately.',
        },
      ],
      reassurance:
        'We will keep the next action obvious so you can move forward without extra guesswork.',
    },
  },
  {
    issueTypeId: 'shower-bath-leak',
    serviceable: {
      headline:
        'Keep the bath or shower leak contained while we prepare the next step.',
      intro:
        'A contained bath or shower leak is usually easiest to manage when the fixture stays off and the wet area stays clear.',
      steps: [
        {
          title: 'Pause use of the bath or shower',
          detail:
            'Leaving the fixture off helps prevent extra water from feeding the leak.',
        },
        {
          title: 'Keep towels in the affected area',
          detail:
            'This can help limit slipping and reduce surface damage while you continue.',
        },
      ],
      reassurance:
        'You have already handled the most important first move. The next step will stay straightforward.',
    },
    outOfArea: {
      headline: 'Keep the area dry while we move you toward a fallback option.',
      intro:
        'This address appears outside the current service area, so the next screen will focus on the safest recovery step instead of normal booking.',
      steps: [
        {
          title: 'Avoid running the bath or shower again',
          detail:
            'Additional water can make the affected area harder to control.',
        },
      ],
      warnings: [
        {
          title: 'If water is reaching nearby walls or ceilings',
          detail:
            'Treat the situation as more urgent and prioritize protecting the surrounding area first.',
        },
      ],
      reassurance:
        'We can still help you move forward clearly, even when the standard service path changes.',
    },
    recovery: {
      headline: 'Please take a safer containment step before continuing.',
      intro:
        'The details shared suggest this leak may be broader than the standard bath or shower path, so limiting spread is the priority.',
      steps: [
        {
          title: 'Keep the fixture off',
          detail:
            'Avoid feeding more water into the area until the next recovery step is clear.',
        },
      ],
      warnings: [
        {
          title: 'If the leak reaches other rooms',
          detail:
            'Protect nearby belongings and follow the recovery guidance instead of the normal booking path.',
        },
      ],
      reassurance:
        'You do not need perfect plumbing details right now. We will keep the next choice simple.',
    },
  },
];

type RequestReviewTemplate = {
  issueTypeId: IssueTypeId;
  eta: RequestReviewExpectation;
  pricing: RequestReviewExpectation;
  nextSteps: RequestReviewNextStep;
};

const requestReviewTemplates: RequestReviewTemplate[] = [
  {
    issueTypeId: 'dripping-faucet',
    eta: {
      label: 'Estimated response window',
      value: 'Usually within 2 to 4 hours',
      detail:
        'Contained single-fixture faucet issues can usually stay in the standard Handrix response flow.',
    },
    pricing: {
      label: 'Pricing expectation',
      value: 'Most visits start with an $89 to $129 assessment',
      detail:
        'If repair work is needed beyond the initial assessment, the scope and added cost are confirmed before you approve anything else.',
    },
    nextSteps: {
      title: 'What happens next',
      detail:
        'After you confirm, Handrix will create the request and move it into the operations review queue.',
      bullets: [
        'We package your issue details, address, and containment context into the request.',
        'Operations reviews the request and starts matching the best next fulfillment step.',
        'If expectations change, we will explain that clearly instead of leaving you guessing.',
      ],
    },
  },
  {
    issueTypeId: 'under-sink-leak',
    eta: {
      label: 'Estimated response window',
      value: 'Usually within 1 to 3 hours',
      detail:
        'Contained cabinet leaks are treated as time-sensitive, but the exact response depends on active volume and nearby capacity.',
    },
    pricing: {
      label: 'Pricing expectation',
      value: 'Most visits start with an $89 to $149 assessment',
      detail:
        'That starting range covers the initial plumbing review. Any additional repair scope is confirmed before work continues.',
    },
    nextSteps: {
      title: 'What happens next',
      detail:
        'Once you confirm, Handrix moves the request into review with the leak details and access notes you already shared.',
      bullets: [
        'We keep the request summary attached so the first review is fast and specific.',
        'The team checks the address, issue scope, and safest next dispatch path.',
        'You will not need to re-enter the same intake details on the next step.',
      ],
    },
  },
  {
    issueTypeId: 'clogged-toilet',
    eta: {
      label: 'Estimated response window',
      value: 'Usually within 1 to 2 hours',
      detail:
        'Contained toilet blockages are treated as higher urgency when they remain limited to one affected fixture.',
    },
    pricing: {
      label: 'Pricing expectation',
      value: 'Most visits start with a $99 to $159 assessment',
      detail:
        'The final repair total depends on the cause of the blockage, but added work is explained before approval.',
    },
    nextSteps: {
      title: 'What happens next',
      detail:
        'Your confirmation moves the request into active operational review with the urgency cues already captured in intake.',
      bullets: [
        'We submit the issue details exactly as you reviewed them here.',
        'Operations checks urgency, scope, and the best next assignment path.',
        'If anything needs clarification later, the follow-up should stay specific and limited.',
      ],
    },
  },
  {
    issueTypeId: 'slow-drain',
    eta: {
      label: 'Estimated response window',
      value: 'Usually within 2 to 4 hours',
      detail:
        'Single-drain slowdowns are usually manageable for a short period, so we present a practical response window instead of a rushed promise.',
    },
    pricing: {
      label: 'Pricing expectation',
      value: 'Most visits start with an $89 to $139 assessment',
      detail:
        'That range covers the initial diagnosis. If clearing or repair work changes the scope, the next price step is confirmed with you first.',
    },
    nextSteps: {
      title: 'What happens next',
      detail:
        'After confirmation, Handrix creates the request, keeps your summary attached, and moves it into the next review stage.',
      bullets: [
        'Your issue details and service location are packaged into the request.',
        'Operations reviews the request and confirms the best fulfillment path.',
        'You will see clear next-stage messaging instead of a silent wait.',
      ],
    },
  },
  {
    issueTypeId: 'shower-bath-leak',
    eta: {
      label: 'Estimated response window',
      value: 'Usually within 1 to 3 hours',
      detail:
        'Contained bath or shower leaks are treated as time-sensitive because spread can increase quickly if the leak worsens.',
    },
    pricing: {
      label: 'Pricing expectation',
      value: 'Most visits start with a $99 to $149 assessment',
      detail:
        'The starting range covers the initial evaluation. If repair scope changes after diagnosis, the added cost is reviewed before work continues.',
    },
    nextSteps: {
      title: 'What happens next',
      detail:
        'Confirmation sends your intake details into the next Handrix review step so the team can act without asking you to repeat the basics.',
      bullets: [
        'We pass along the contained leak context and access details you already entered.',
        'Operations reviews the request and checks the best dispatch path.',
        'If timing changes, the update should stay honest and easy to scan.',
      ],
    },
  },
];

@Injectable()
export class ReferenceDataService {
  getIssueTypes() {
    return supportedIssueTypes;
  }

  getIntakeQuestionSet(issueTypeId: IntakeQuestionSet['issueTypeId']) {
    return (
      intakeQuestionSets.find(
        (questionSet) => questionSet.issueTypeId === issueTypeId,
      ) ?? null
    );
  }

  getIssueType(issueTypeId: IssueTypeId) {
    return (
      supportedIssueTypes.find((issueType) => issueType.id === issueTypeId) ??
      null
    );
  }

  getContainmentGuidance(
    issueTypeId: IssueTypeId,
    request: ContainmentGuidanceRequest,
  ): ContainmentGuidance | null {
    const template = containmentGuidanceTemplates.find(
      (entry) => entry.issueTypeId === issueTypeId,
    );

    if (!template) {
      return null;
    }

    const content =
      request.serviceabilityStatus === 'serviceable'
        ? {
            ...template.serviceable,
            variant: 'informational' as const,
            warnings: [] as ContainmentGuidance['warnings'],
          }
        : request.serviceabilityStatus === 'outOfArea'
          ? {
              ...template.outOfArea,
              variant: 'warning' as const,
            }
          : {
              ...template.recovery,
              variant: 'recovery' as const,
            };

    return {
      issueTypeId,
      serviceabilityStatus: request.serviceabilityStatus,
      nextStep: request.nextStep,
      recoveryCode: request.recoveryCode,
      variant: content.variant,
      headline: content.headline,
      intro: content.intro,
      steps: content.steps,
      warnings: content.warnings,
      reassurance: content.reassurance,
      nextActionLabel:
        request.nextStep === 'continueToContainment'
          ? 'Continue to request review'
          : 'See recovery options',
      nextActionHint:
        request.nextStep === 'continueToContainment'
          ? 'Next, we will summarize timing, pricing expectations, and your request details.'
          : 'We will guide you to the clearest fallback path next.',
    };
  }

  getRequestReviewTemplate(issueTypeId: IssueTypeId) {
    return (
      requestReviewTemplates.find(
        (entry) => entry.issueTypeId === issueTypeId,
      ) ?? null
    );
  }
}
