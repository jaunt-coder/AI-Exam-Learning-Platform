# Attempt Pipeline (M1 · WP-02)

Milestone: **M1 Learning Loop MVP**  
Modules: `runtime/attempt-service.js` → `runtime/state-update.js`  
Status: **IMPLEMENTED**

---

## Flow

```text
Attempt Event
  ↓  build (grader result + SoT reference)
Persist (LocalStorage learning.attempts.v1, append-only)
  ↓
Learning State update (learning.state.v1)
```

Aligned with WO-014.1 AttemptEvent schema (`schemaVersion=wo014.1-1.0`).

---

## Persist keys (additive)

| Key | Content |
|-----|---------|
| `learning.attempts.v1` | `{ events: AttemptEvent[] }` |
| `learning.state.v1` | `{ students: { [student_id]: StudentLearningState } }` |

Constitution keys (`progress`, `wrongAnswers`, …) **unchanged**.

---

## AttemptEvent (runtime)

Required: `event_id`, `student_id`, `question_id`, `pattern_id`, `selected_answer`, `correct_answer_reference`, `result`, `timestamp`.

`correct_answer_reference` stores **pointer only** (source path + question_id + field=`answer`).  
Does not rewrite Answer SoT.

Idempotency: duplicate `event_id` → reject (no double count).

---

## Learning State update rules (WP-03)

On accepted event:

1. `learning_data_status`: `empty` → `observed`
2. Append `question_history`
3. Upsert `pattern_states[pattern_id]` counters:
   - `attempt_count++`
   - `correct_count++` or `wrong_count++`
   - `observed_accuracy` = `correct_count / attempt_count`
4. `mastery` / `mastery_status` = **`unknown`** (policy not executed)
5. `recommendation_state.next_action` = **`unknown`** (recommendation absent)
6. Do not write `error_states` / `transition_history`

---

## API

| Function | Role |
|----------|------|
| `submitAttempt(params)` | grade + build + persist event |
| `applyAttemptEvent(state, event)` | pure counter projection |
| `applyAndSaveAttemptEvent` | apply + persist state |
| `runLearningLoopCycle` | full M1 cycle orchestrator |

---

## Owner

05_Data_Engineer (M1 WP-02 / WP-03)
