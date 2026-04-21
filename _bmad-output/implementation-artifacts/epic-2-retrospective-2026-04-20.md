# Epic 2 Retrospective

Date: 2026-04-20
Epic: 2
Title: Deliver Confirmation, Tracking, and Recovery
Status: complete

## 1. Epic Review

### Epic Outcome

Epic 2 met its core product goal: customers can now move from request confirmation into a coherent tracking experience with backend-owned public statuses, a live timeline, recovery-state handling, and preserved customer-visible history. This directly advanced FR8, FR9, FR10, FR11, FR15, FR16, FR19, FR20, FR23, and FR24 from the planning artifacts.

The epic also strengthened the architecture in the right order:

- Story 2.1 upgraded the post-submit confirmation moment so the product no longer felt like a raw success dump.
- Story 2.2 established backend-owned public-status mapping and shared contracts instead of frontend-owned status copy.
- Story 2.3 created the anonymous tracking seam and calm invalid-token recovery path.
- Story 2.4 extended that seam into a timeline-driven tracking surface.
- Story 2.5 handled recovery states honestly with dedicated backend-owned delay, clarification, and unavailable messaging.
- Story 2.6 preserved customer-visible history in a more durable, reconstructable way for future ops and support work.

### What Went Well

- The team kept lifecycle truth in the backend across the whole epic. That was the strongest architectural win and prevented frontend drift.
- Shared contracts in `packages/shared-contracts/src/requests/` became the reliable center of gravity for request status evolution.
- The epic sequencing was strong. Each story built on a seam introduced by the previous one rather than rewriting prior work.
- The customer experience stayed emotionally consistent. Confirmation, tracking, recovery, and refresh behavior all reinforced the “calm, trustworthy progress” direction from the UX specification.
- Validation discipline was consistently strong in the story records. The repeated use of `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build` kept regressions low while the request model evolved.

### What Created Friction

- Git history was too sparse to serve as a meaningful source of implementation context. The team had to rely on live code and story artifacts instead.
- Story 2.6 showed that the file-backed request store is still a friction point. It can support MVP progress, but richer lifecycle and history work now requires normalization logic and careful shape management.
- The request domain accumulated more presenter/helper logic through the epic. That was the correct short-term move, but it increases the need for disciplined boundaries before Epic 3 expands internal lifecycle control.
- Retrospective readiness lagged behind sprint tracking. `sprint-status.yaml` marked Epic 2 retrospective as done, but there was no retrospective artifact in `implementation-artifacts` before this document.

### Recurring Patterns Across Stories

#### Positive Patterns

- Backend-owned customer-safe projection
  The team repeatedly chose backend-derived status, recovery, and tracking content over frontend inference. This was the right pattern every time.

- Incremental seam-building
  The epic did not jump straight to a full dispatch platform. It progressively shaped request creation, status mapping, tracking lookup, timeline rendering, recovery messaging, and history preservation.

- Contract-first extensions
  Stories tended to extend existing shared request contracts rather than invent one-off response shapes. That improved safety and predictability.

#### Risk Patterns

- Growing presenter complexity
  Request-related presentation concerns are now split across status presentation, recovery presentation, timeline/history projection, and service response shaping. This is manageable, but Epic 3 will increase pressure here.

- Temporary persistence seam carrying long-term weight
  The JSON store continues to absorb more operational responsibility than originally intended. The architecture already points to PostgreSQL + Prisma, so future lifecycle work should avoid deepening file-store coupling.

- Story artifact quality depended on the live codebase more than repository history
  That worked, but it means continuity is fragile if story documentation quality drops.

### Key Lessons Learned

1. The decision to keep customer-safe status and recovery logic backend-owned was the single highest-value technical decision in Epic 2.
2. Shared contracts were not just a convenience; they were the main control mechanism preventing confirmation, tracking, recovery, and history features from diverging.
3. The story order for Epic 2 was effective. Later stories reused existing seams instead of forcing rework, especially from 2.2 onward.
4. The current file-backed persistence approach is still acceptable for MVP shaping, but it is now clearly a transitional seam rather than a comfortable long-term foundation.
5. Code review still matters even when all validations pass. Story 2.6 surfaced a real ordering concern in review that the green test suite did not catch.

### Technical Debt and Carry-Forward Risks

- The request history normalization path still depends on assumptions about persisted ordering and shape quality in the file store.
- The request domain now has enough lifecycle/presenter logic that Epic 3 should avoid scattering new operations behavior across service methods and React components.
- The architecture target of PostgreSQL + Prisma is becoming more justified by actual product complexity, not just future ambition.
- There is still limited explicit documentation of request-domain invariants outside the story artifacts and code.

### Team/System Improvements

- Keep writing story artifacts with strong Dev Notes and Completion Notes. They were materially useful for Epic 2 continuity.
- Use code review findings as a required learning loop, not just a release gate.
- Start treating request lifecycle transitions as a first-class architectural surface with explicit invariants whenever internal ops actions are added.

## 2. Next Epic Preparation

### Epic 3 Readiness

Epic 3 is the right next step. Epic 2 established the customer-facing trust layer, and Epic 3 is where internal operations gain the tools needed to keep that trust credible in day-to-day fulfillment.

Epic 3 should inherit these guardrails from Epic 2:

- Internal lifecycle changes must continue to originate in the backend only.
- Customer-visible statuses must remain curated projections, never raw ops states.
- Shared contracts must continue to define the trusted public/internal boundary.
- Request history must stay aligned with what the customer saw, especially when ops actions affect dispatch progress or recovery messaging.

### Recommended Focus for Epic 3

1. Make lifecycle transitions explicit and guarded before adding broad ops UI behavior.
2. Reuse the request-domain seams already established in `apps/handrix-api/src/modules/requests/` instead of branching into parallel status systems.
3. Design ops actions so they naturally append to durable request history and preserve customer-facing consistency.
4. Keep internal tooling lean. Epic 3 should enable queue review, request detail visibility, assignment, and guarded status updates without trying to solve every support workflow at once.

### Concrete Action Items

- Product / Scrum Master
  Add a lightweight retrospective artifact check to the workflow so sprint tracking cannot mark an epic retrospective as done without a saved document.

- Engineering
  Before or during early Epic 3 work, document request lifecycle invariants and valid transition rules in one backend-owned place that future stories can reference directly.

- Engineering
  Treat request history ordering and normalization as a known guardrail area. Any Epic 3 lifecycle mutation work should include coverage for ordered history consistency, not just current-state correctness.

- Architecture / Engineering
  Be deliberate about how much more responsibility stays in the file-backed store. If Epic 3 starts straining that seam further, prioritize Story 5.1 earlier or tighten the boundary around temporary persistence assumptions.

- QA / Review
  Keep adversarial code review as a standard step for lifecycle-sensitive changes. Validation success alone is not enough for request-domain changes anymore.

### Final Assessment

Epic 2 was successful. It delivered a meaningful customer-facing trust layer and did so in a way that mostly respected the intended architecture. The biggest win was disciplined backend ownership of public status behavior. The biggest caution is that the request domain is now important enough that lifecycle and history semantics need even stronger explicit guardrails as Epic 3 begins.

If Epic 3 preserves the Epic 2 patterns and tightens lifecycle invariants instead of bypassing them, the project is in a strong position to add operations capability without undermining the customer experience.
