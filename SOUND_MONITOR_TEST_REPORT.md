# Classroom sound monitor — 27 September 2026

Implemented in the classroom dock and Whiteboard → Teaching Tools → Sound Level.

## Verified

- Full automated suite: 105 tests passed across 20 files.
- Sound tests cover relative level calculation, sensitivity, transient rejection, sustained-noise alerts, quiet-period rearming and cooldown.
- Microphone lifecycle tests use fake audio devices to verify stream release, cancellation before permission resolves, retry after denial, failed audio setup and interrupted devices.
- Classroom persistence test saves only monitor preferences, not microphone sessions or audio.
- Browser checks at 1280×720 and 375×812: gauge, threshold keyboard adjustment, bell toggle, sensitivity disclosure/adjustment and classroom persistence after reload. Reload leaves the microphone off.
- The blocked-hosting-policy message appears correctly when Start microphone is pressed.
- Production build passed. Lint passed with warnings, including the existing teaching-tool registration/Fast Refresh pattern. Git whitespace check passed.

## Pending

Update 29 September 2026: with the owner's explicit approval the server now sends `microphone=(self)` in Permissions-Policy, and this is deployed to whiteboard.jaihind.school. Browser permission prompts remain; camera and geolocation stay blocked. Live microphone input and audible alerts on a classroom device have not been verified.

The monitor does not record or upload audio.
