/**
 * Tests pour l'utilitaire de normalisation des langages de code
 */

import { describe, it, expect } from 'vitest';
import { normalizeCodeLanguage, normalizeMarkdownCodeBlocks } from '../utils/code-language-normalizer';

describe('Code Language Normalizer', () => {
  describe('normalizeCodeLanguage', () => {
    it('devrait normaliser des langages spécifiques à Ollama', () => {
      expect(normalizeCodeLanguage('tool_code')).toBe('javascript');
      expect(normalizeCodeLanguage('py')).toBe('python');
      expect(normalizeCodeLanguage('python3')).toBe('python');
      expect(normalizeCodeLanguage('sh')).toBe('bash');
      expect(normalizeCodeLanguage('shell')).toBe('bash');
    });

    it('devrait conserver les langages déjà reconnus', () => {
      expect(normalizeCodeLanguage('javascript')).toBe('javascript');
      expect(normalizeCodeLanguage('python')).toBe('python');
      expect(normalizeCodeLanguage('typescript')).toBe('typescript');
      expect(normalizeCodeLanguage('java')).toBe('java');
    });

    it('devrait gérer les langages avec des caractères non alphanumériques', () => {
      expect(normalizeCodeLanguage('c++')).toBe('c++');
      expect(normalizeCodeLanguage('c#')).toBe('c#');
      expect(normalizeCodeLanguage('  javascript  ')).toBe('javascript');
    });

    it('devrait gérer les cas vides ou non définis', () => {
      expect(normalizeCodeLanguage('')).toBe('');
      expect(normalizeCodeLanguage(null)).toBe('');
      expect(normalizeCodeLanguage(undefined)).toBe('');
    });

    it('devrait traiter les correspondances partielles', () => {
      // Ces tests sont plus flexibles et peuvent varier selon l'implémentation
      expect(normalizeCodeLanguage('javascripting')).toBe('javascript');
      expect(normalizeCodeLanguage('pythonic')).toBe('python');
    });

    it('devrait retourner une chaîne vide pour les langages non reconnus', () => {
      expect(normalizeCodeLanguage('langage_inconnu')).toBe('');
      expect(normalizeCodeLanguage('xyz123')).toBe('');
    });
  });

  describe('normalizeMarkdownCodeBlocks', () => {
    it('devrait normaliser les blocs de code dans le markdown', () => {
      const markdown = '```tool_code\nconst x = 1;\n```\n\n```py\nprint("hello")\n```';
      const normalized = normalizeMarkdownCodeBlocks(markdown);
      
      expect(normalized).toBe('```javascript\nconst x = 1;\n```\n\n```python\nprint("hello")\n```');
    });

    it('devrait gérer les blocs de code sans spécification de langage', () => {
      const markdown = '```\ncode sans langage\n```';
      const normalized = normalizeMarkdownCodeBlocks(markdown);
      
      expect(normalized).toBe('```\ncode sans langage\n```');
    });

    it('devrait gérer le markdown sans blocs de code', () => {
      const markdown = 'Texte simple sans bloc de code';
      const normalized = normalizeMarkdownCodeBlocks(markdown);
      
      expect(normalized).toBe('Texte simple sans bloc de code');
    });

    it('devrait gérer le cas où le markdown est vide', () => {
      expect(normalizeMarkdownCodeBlocks('')).toBe('');
      expect(normalizeMarkdownCodeBlocks(null)).toBe('');
      expect(normalizeMarkdownCodeBlocks(undefined)).toBe('');
    });

    it('devrait préserver le contenu des blocs de code', () => {
      const markdown = '```python\ndef hello():\n    print("world")\n```';
      const normalized = normalizeMarkdownCodeBlocks(markdown);
      
      expect(normalized).toBe('```python\ndef hello():\n    print("world")\n```');
    });

    it('devrait gérer plusieurs blocs de code avec différents langages', () => {
      const markdown = '# Titre\n\n```js\nconst x = 1;\n```\n\nTexte intermédiaire\n\n```shell\nls -la\n```';
      const normalized = normalizeMarkdownCodeBlocks(markdown);
      
      expect(normalized).toBe('# Titre\n\n```javascript\nconst x = 1;\n```\n\nTexte intermédiaire\n\n```bash\nls -la\n```');
    });
  });
});
