export function createDryRunBrokerAdapter({ name, displayName, optOutUrl = null, optOutMethod = 'form', category = 'people-search', jurisdiction = 'US' }) {
  return {
    name,
    displayName,
    adapterType: 'broker',
    dryRun: true,
    meta: { optOutUrl, optOutMethod, category, jurisdiction },

    prepareRequest(input = {}) {
      const requestId = input.requestId || `b1-${name}-dry-run`;
      const person = input.person || {};

      return {
        requestId,
        broker: name,
        adapterType: 'broker',
        dryRun: true,
        action: 'remove-data-broker-record',
        identityHints: {
          fullName: person.fullName || null,
          emails: Array.isArray(person.emails) ? person.emails : [],
          phones: Array.isArray(person.phones) ? person.phones : [],
          usernames: Array.isArray(person.usernames) ? person.usernames : [],
          jurisdiction: person.jurisdiction || 'US'
        },
        preparedAt: new Date().toISOString()
      };
    },

    async submit(request, input = {}) {
      const simulation = input.simulate?.[name];
      if (simulation === 'transient-error') {
        const error = new Error(`${displayName} dry-run transient submit error`);
        error.code = 'BROKER_RATE_LIMITED';
        error.transient = true;
        throw error;
      }

      if (simulation === 'permanent-error') {
        const error = new Error(`${displayName} dry-run permanent submit error`);
        error.code = 'BROKER_SUBMISSION_REJECTED';
        error.transient = false;
        throw error;
      }

      return {
        broker: name,
        status: 'submitted',
        dryRun: true,
        ticketId: `${name}-${request.requestId}-dryrun`,
        submittedAt: new Date().toISOString()
      };
    },

    parseResult(submission, request) {
      return {
        broker: name,
        status: 'success',
        dryRun: true,
        requestId: request.requestId,
        ticketId: submission.ticketId,
        candidateRecords: [
          {
            broker: name,
            matchStrength: 'sample',
            removalPath: 'dry-run-prefilled-request'
          }
        ],
        notes: [`${displayName} adapter ran in dry-run mode; no external request was sent.`]
      };
    }
  };
}
