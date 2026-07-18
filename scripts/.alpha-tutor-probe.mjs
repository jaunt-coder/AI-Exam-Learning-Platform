import { readFileSync } from 'fs';
        import { join, dirname } from 'path';
        import { fileURLToPath } from 'url';
        import { generateQuestionTutorContent } from '../js/ai-tutor-engine.js';

        const root = join(dirname(fileURLToPath(import.meta.url)), '..');
        const read = (rel) => readFileSync(join(root, rel), 'utf8');
        const payload = JSON.parse(read('data/question-db-mvp.json'));
        const patterns = JSON.parse(read('data/pattern-db-mvp.json'));
        const questions = payload.questions || payload;
        const patternMap = Object.fromEntries(patterns.map((p) => [p.patternId, p]));
        const ids = JSON.parse(process.argv[2] || '[]');
        const results = ids.map((id) => {
          const q = questions.find((item) => item.questionId === id);
          if (!q) return { questionId: id, ok: false, reason: 'not found' };
          const content = generateQuestionTutorContent(q, patternMap[q.patternId]);
          const sections = [
            Boolean(String(content.explanation || '').trim()),
            Array.isArray(content.solvingAlgorithm) && content.solvingAlgorithm.length > 0,
            content.wrongAnswerAnalysis && Object.keys(content.wrongAnswerAnalysis).length >= 4,
            Boolean(String(content.memoryTip || '').trim()),
          ];
          return {
            questionId: id,
            ok: sections.every(Boolean),
            sections: {
              explanation: sections[0],
              algorithm: sections[1],
              wrongAnalysis: sections[2],
              memoryTip: sections[3],
            },
          };
        });
        console.log(JSON.stringify(results));