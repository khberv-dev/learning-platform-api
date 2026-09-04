# Task submission API

## Get one task submission

`GET /api/task-submissions/:taskId`

Requires a student access token. The student must have an active, unexpired enrollment for the task's course.
Correct-answer keys are not returned; each question contains only the authenticated student's submitted `answer`.

Example response:

```json
{
  "taskId": "task-uuid",
  "name": "Vocabulary",
  "file": null,
  "contentType": null,
  "questions": [
    {
      "question": "Choose a letter",
      "options": ["A", "B"],
      "answer": "b"
    },
    {
      "question": "Write a word",
      "options": null,
      "answer": null
    }
  ],
  "isCorrect": false,
  "submittedAt": "2026-09-04T12:00:00.000Z"
}
```

Returns `404` when the student, task, or that student's submission does not exist. Returns `403` when the student
does not have a current enrollment for the course.
