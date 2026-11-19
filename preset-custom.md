# Custom preset: Sky Marble Rush

## 1. Identity

- Genre label: Runner-action (marble roller on a narrow sky track).
- Core loop: The player holds to roll a glossy marble forward and slides to steer it along a narrow sky track, overcoming swinging hammers, spinning sweeper bars, smashable cube walls, jump-pad gaps, rail-less edges and a level clock, to reach the mega ramp and stop on the highest multiplier of the rainbow landing field.
- Render: Three.js, third-person chase camera behind the ball, procedural track pieces, PBR-ish glossy marble with an environment map, shader sky per level. Look profile: stylized-realistic (smooth bevelled shapes, physically lit, saturated, no outlines).
- Closest preset: racing (hold to go, drag to steer, chase camera, seeded track). Borrowed: bot shape, danger shape, speed-read layers, camera family, must-haves.

### Variants

Custom game: the description is the variation; no row is drawn.

## 2. Controls

1. Hold anywhere = roll: forward speed rises at `accel` to `maxSpeed`.
2. While holding, horizontal finger travel steers: the lateral target velocity is `clamp(dragDx / 70px, -1, 1) * steerSpeed`, measured from a floating origin that re-centres at 0.6 of the travel per second (relative steering; finger right = ball right). Lateral velocity follows its target with `damp(v, target, 14, dt)`; after release at rate 20.
3. Release = brake: speed falls at `brakeDecel` (strong), the ball keeps rolling slower; braking is the timing tool for hammers and sweepers.
4. Keyboard: Space/Up hold, Left/Right steer.
5. The marble rolls visually: rotation about its axle at `speed / radius`, lateral roll from lateral speed.

## 3. Flow and timing

| Beat | Rule |
| --- | --- |
| Intro | Camera swoops from high above the start pad down behind the ball in 1.4 s; level name banner |
| Ready | Ball idles with a soft bob; hand hint "Hold to roll, slide to steer"; the clock starts on the first touch |
| Run | Track segments stream ahead; coins in lines; power-up bubbles hover over the track |
| Hazard | Hammers swing across the track (period 2.4-3.2 s); sweepers rotate at track level; cube walls block the full width; jump pads before gaps |
| Fall | Ball leaves the track: it drops, camera holds, a life is lost, respawn at the last checkpoint after 1.2 s with 1.5 s of blink |
| Ramp | Mega ramp at the end of each level: launch speed sets the flight; landing on the rainbow field of 10 bands x1, x2, x3, x4, x5, x6, x8, x10, x15, x20; hold keeps rolling, release brakes; rolling off the far end = x1 |
| Level clear | Coins x multiplier count-up, confetti, result card with Next |
| Lose | Lives reach 0 or the clock reaches 0: result card with Replay |

Timing at Normal (bot): level 1 clear 25-35 s, level 2 clear by 70 s total, level 3 by 110 s, level 4 by 150 s.

## 4. Rules

1. Track: a chain of straight and gently curving segments along +Z (curves bend X by up to 6 units), width `trackWidth` (3.4 at level 1, x0.9 per level), the ball radius 0.5. Railed segments have candy-striped rails (the ball bounces off at 40 % of its lateral speed); rail-less segments let the ball roll off the edge.
2. Generation is seeded per level (`seed 1000 + level * 77`) from a list of authored beats per level (section 11); no Math.random in gameplay.
3. Swinging hammer: a pivot on a gantry over the track, head sweeps across the full width, period `hammerPeriod`; contact pushes the ball sideways at 14 u/s (off the track where there is no rail) and costs speed; a telegraph whoosh sound and shadow on the track.
4. Sweeper arm: a single arm spinning about a post in the track centre at track height, `sweeperRpm` (one pass per turn, so a waiting ball always gets a window); contact pushes the ball outward.
5. Cube wall: a 4 x 3 wall of cubes spanning the track; hitting it at speed >= `smashSpeed` smashes it (cubes fly, small speed loss 15 %); slower bounces the ball back (speed set to -4) and costs 1 s of clock.
6. Jump pad gap: a glowing pad before a gap of `gapLen` units; the pad launches the ball (vy 7.5); ball must carry over; under `jumpMinSpeed` it falls short.
7. Coins: lines of 5-8; +1 each (+2 with x2).
8. Power-ups (floating bubbles, one kind each): speed boost (`boostTime` s at `boostSpeed`), bubble shield (absorbs one hit or one fall-off: hop back to the centre), coin magnet (`magnetTime` s, radius 3.5), x2 coins (`doubleTime` s), extra life (+1, max 5), extra time (+`extraTime` s), giant ball (`giantTime` s, radius x2.2, smashes hammers, sweepers and walls, cannot fall off rail-less edges because it widens contact: the edge tolerance grows by the radius).
9. Lives `lives` (3). Clock `levelTime` s per level, visible, counts down; under 8 s it pulses red.
10. Checkpoint every hazard beat; respawn there.
11. Mega ramp: launch speed clamped to 9..maxSpeed (a boost never overshoots the field), x 1.05 forward, vy from the ramp slope + 3.5; landing field 10 bands of `bandLen` units; on the field hold accelerates at 40 % of `accel`, release brakes at `brakeDecel`; the band under the ball when it stops is the multiplier; off the end = x1.

- Danger: the largest of `1 - clock / levelTime` weighted 0.6, `1 - (distance to nearest edge / (trackWidth/2))` while a hazard is within 6 units, and `1 - lives / 3` x 0.5; a fall is danger 1.

### Bonuses

| Kind | Level | Rule |
| --- | --- | --- |
| rate (speed boost) | 1+ | `boostTime` s at `boostSpeed` |
| reach (coin magnet) | 1+ | pulls coins within 3.5 units for `magnetTime` s |
| multiplier (x2 coins) | 1+ | coins pay x2 for `doubleTime` s |
| shield (bubble shield) | 2+ | absorbs one hit or one fall |
| time (extra time) | 2+ | +`extraTime` s on the clock |
| life (extra life) | 3+ | +1 life |
| giant (giant ball) | 3+ | `giantTime` s, smashes everything |

Level 1: 3 kinds, 4 events. Level 2: 5 kinds. Levels 3-4: all 7.

## 5. Parameters

```
maxPlayTime — Time cap, s (Timing): int, 240, 60–400, restart
stageCount — Levels (Timing): int, 4, 1–4, restart
stageScale — Level step (Difficulty): float, 1.12, 1–1.4, restart, difficulty easier-low
hintDelay — Hint delay, s (Timing): float, 2.2, 1–6, live
ctaText — Button text (Branding): text, NEXT, 14 chars, live
storeUrlIos — iOS link (Branding): text, , 200 chars, live
storeUrlAndroid — Android link (Branding): text, , 200 chars, live
maxSpeed — Top rolling speed (Player): float, 15, 9–24, live, difficulty easier-high, marketer
accel — Acceleration (Player): float, 14, 6–26, live, difficulty easier-high, marketer
brakeDecel — Brake strength (Player): float, 22, 8–40, live, difficulty easier-high
steerSpeed — Steering speed (Player): float, 7.5, 4–12, live, difficulty easier-high, marketer
levelTime — Level clock, s (Difficulty): int, 32, 20–90, restart, difficulty easier-high, marketer
lives — Lives (Difficulty): int, 3, 1–5, restart, difficulty easier-high, marketer
trackWidth — Track width (Difficulty): float, 3.4, 2.4–5, restart, difficulty easier-high
hammerPeriod — Hammer swing period, s (Enemies): float, 2.8, 1.6–4.5, live, difficulty easier-high, marketer
sweeperRpm — Sweeper speed, rpm (Enemies): float, 16, 8–40, live, difficulty easier-low
smashSpeed — Speed needed to smash walls (Difficulty): float, 10, 5–15, live, difficulty easier-low
jumpMinSpeed — Speed needed to clear gaps (Difficulty): float, 8, 4–12, live, difficulty easier-low
gapLen — Gap length (Difficulty): float, 5, 3–9, restart, difficulty easier-low
boostSpeed — Boost speed (Player): float, 22, 15–30, live, difficulty easier-high
boostTime — Boost time, s (Player): float, 2.2, 1–5, live, difficulty easier-high
magnetTime — Magnet time, s (Player): float, 7, 2–15, live, difficulty easier-high
doubleTime — x2 coins time, s (Economy): float, 8, 3–15, live
giantTime — Giant ball time, s (Player): float, 5, 2–10, live, difficulty easier-high
extraTime — Extra time, s (Player): int, 8, 3–20, live, difficulty easier-high
bandLen — Multiplier band length (Economy): float, 4.2, 2.5–7, restart, difficulty easier-high
sfxVolume — Sound effects volume (Visual): float, 0.3, 0–1, live
musicVolume — Music volume (Visual): float, 0.2, 0–1, live
```

## 6. Bot and hint

- Bot: hold; steer to the safe lateral lane of the next hazard (hammer: wait by braking until the head passes the ball's lane then go; sweeper: the side where the arm is moving away; wall: full speed; pad: full speed through the pad centre); grab bubbles within 1.2 units of the line; on the landing field release when the projected stop lies in the x20 band.
- Hint target: the hold-and-slide gesture before the first touch; "Release to brake!" before the first hammer; "Hold to roll" after 2.2 s of release.

## 7. Progress and analytics

- Progress = distance / level length. Phases: TUTORIAL, LEVEL1..LEVEL4, RAMP, ENDCARD. Events: `coin`, `powerup`, `hammer_passed`, `sweeper_passed`, `wall_smashed`, `gap_jumped`, `brake`, `fall`, `life_lost`, `ramp_launch`, `landing`, `level_clear`.

## 8. Theme slots

Marble (glossy candy swirl glass, colour per skin), track tiles (pastel stone with bevel and seams per level), rails (candy stripes), hammers (wooden handle, chunky red-gold head), sweepers (striped bar), cubes (glossy coloured cubes), pads (glowing chevrons), skies: floating islands (painterly blue with cloud islands), sunny cliffs (bright noon, ocean below), sunset canyon (orange-violet, mesas), deep space (nebula, stars, planets). Every model is procedural (no characters in this game).

## 9. Pipeline notes

- Pipeline asked: three-tripo (form dimension 3d). This workspace cannot download generated files (asset CDNs unreachable), so every model is built in code (three-only art, reported to the user in the brief and summary); there are no characters, so no rigs. The cover and icon are rendered from the game.
- Music: synth upbeat arcade loop, 128 bpm, major key, plucks and bass.
- QA command: `--preset custom --mode game --pipeline three-only`.

## 10. Must-haves

- Speed read: rail posts and tile seams pass at both edges; speed lines above 70 % speed; FOV kick on boost.
- Marble rotation matches travel (no sliding look); blob/contact shadow under the ball.
- Every hazard telegraphs (shadow, whoosh, colour) before it can hit.
- The rainbow field labels read from the camera side.
- Ground surfaces baked with seams/patterns, never a flat fill.
- Host contract, `window.__game`, `?tune`, en/es/zh strings.

## 11. Stages

| Level | Place | Content | Payoff |
| --- | --- | --- | --- |
| 1 | Floating Islands | railed track, coin lines, 2 cube walls, 1 jump-pad gap, 1 hammer near the end, boost/magnet/x2 | Mega ramp, first multiplier landing |
| 2 | Sunny Cliffs | rail-less sections, 3 hammers, 1 wall, 1 gap; + shield, extra time (twist: rail-less edges + hammers; event `hammer_passed`) | ramp, bigger field |
| 3 | Sunset Canyon | spinning sweepers x3, narrower track, 2 gaps, walls; + giant ball, extra life | ramp |
| 4 | Deep Space | all hazards mixed, narrowest, low gravity jumps, double hammers | ramp, final x20 field, finale confetti |

Trailer: level 1, the bot brakes late on the hammer and is knocked off twice, then the clock runs out (loss by lives at ~24 s).
