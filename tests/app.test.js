const { esc, splitChunks, formatAuthors, extractKeywords, truncateDoi, filterItems, cleanAbstract } = require('../app');

/* ── esc() ── */
describe('esc', () => {
  test('returns empty string for null', () => {
    expect(esc(null)).toBe('');
  });

  test('returns empty string for undefined', () => {
    expect(esc(undefined)).toBe('');
  });

  test('returns empty string for empty string', () => {
    expect(esc('')).toBe('');
  });

  test('escapes HTML special characters', () => {
    expect(esc('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  test('escapes ampersand', () => {
    expect(esc('A & B')).toBe('A &amp; B');
  });

  test('handles numeric input', () => {
    expect(esc(42)).toBe('42');
  });

  test('double-escapes already-escaped input', () => {
    expect(esc('&amp;')).toBe('&amp;amp;');
  });
});

/* ── splitChunks() ── */
describe('splitChunks', () => {
  test('returns single chunk for short text', () => {
    expect(splitChunks('Hello world.', 100)).toEqual(['Hello world.']);
  });

  test('splits at sentence boundaries', () => {
    const text = 'First sentence. Second sentence. Third sentence.';
    const result = splitChunks(text, 20);
    expect(result.length).toBeGreaterThan(1);
    // Each chunk should be within max length
    result.forEach(chunk => expect(chunk.length).toBeLessThanOrEqual(20));
  });

  test('handles text without sentence-ending punctuation', () => {
    const result = splitChunks('no punctuation here', 100);
    expect(result).toEqual(['no punctuation here']);
  });

  test('hard-splits very long sentences that exceed max', () => {
    const longSentence = 'a'.repeat(50);
    const result = splitChunks(longSentence, 20);
    expect(result.length).toBe(3); // 20 + 20 + 10
    expect(result[0].length).toBe(20);
    expect(result[1].length).toBe(20);
    expect(result[2].length).toBe(10);
  });

  test('returns empty array for empty string (edge case — may want to return [""])', () => {
    // NOTE: Current behavior returns [] for empty input.
    // This could cause issues if callers assume at least one chunk.
    expect(splitChunks('', 100)).toEqual([]);
  });

  test('handles text exactly at max length', () => {
    const text = 'Exact length.';
    expect(splitChunks(text, text.length)).toEqual([text]);
  });

  test('handles question marks and exclamation marks as boundaries', () => {
    const text = 'Question? Exclamation! Statement.';
    const result = splitChunks(text, 15);
    expect(result.length).toBeGreaterThan(1);
  });
});

/* ── formatAuthors() ── */
describe('formatAuthors', () => {
  test('formats single author', () => {
    const result = formatAuthors([{ family: 'Smith', given: 'John' }]);
    expect(result).toBe('Smith J.');
  });

  test('formats multiple authors with commas', () => {
    const result = formatAuthors([
      { family: 'Smith', given: 'John' },
      { family: 'Doe', given: 'Jane' },
    ]);
    expect(result).toBe('Smith J., Doe J.');
  });

  test('adds et al. for more than 4 authors', () => {
    const authors = Array.from({ length: 5 }, (_, i) => ({
      family: `Author${i}`,
      given: `First${i}`,
    }));
    const result = formatAuthors(authors);
    expect(result).toContain('et al.');
    // Should only show first 4
    expect(result).not.toContain('Author4');
  });

  test('handles missing given name', () => {
    const result = formatAuthors([{ family: 'Smith' }]);
    expect(result).toBe('Smith .');
  });

  test('handles missing family name', () => {
    const result = formatAuthors([{ given: 'John' }]);
    expect(result).toBe('J.');
  });

  test('handles null/undefined author list', () => {
    expect(formatAuthors(null)).toBe('');
    expect(formatAuthors(undefined)).toBe('');
  });

  test('handles empty author list', () => {
    expect(formatAuthors([])).toBe('');
  });
});

/* ── extractKeywords() ── */
describe('extractKeywords', () => {
  const stopWords = new Set(['which', 'these', 'their', 'using', 'based', 'have', 'been', 'this', 'that', 'with']);

  test('extracts frequent words from titles', () => {
    const titles = [
      'Neural network based sensor device',
      'Deep neural network for detection',
      'Advanced neural computing systems',
    ];
    const result = extractKeywords(titles, stopWords);
    expect(result[0]).toBe('neural');
  });

  test('filters out short words (length <= 4)', () => {
    const titles = ['The big cat ran fast and far away'];
    const result = extractKeywords(titles, stopWords);
    // 'away' is 4 chars, should be excluded
    result.forEach(kw => expect(kw.length).toBeGreaterThan(4));
  });

  test('filters out stop words', () => {
    const titles = ['Using these which based their methods'];
    const result = extractKeywords(titles, stopWords);
    expect(result).not.toContain('using');
    expect(result).not.toContain('these');
    expect(result).not.toContain('based');
  });

  test('returns at most 6 keywords', () => {
    const titles = ['alpha bravo charlie delta echo foxtrot gamma hotel india juliet'];
    const result = extractKeywords(titles, stopWords);
    expect(result.length).toBeLessThanOrEqual(6);
  });

  test('handles empty titles array', () => {
    expect(extractKeywords([], stopWords)).toEqual([]);
  });
});

/* ── truncateDoi() ── */
describe('truncateDoi', () => {
  test('returns empty string for falsy input', () => {
    expect(truncateDoi('')).toBe('');
    expect(truncateDoi(null)).toBe('');
    expect(truncateDoi(undefined)).toBe('');
  });

  test('returns full DOI if under 42 chars', () => {
    const doi = '10.1234/short';
    expect(truncateDoi(doi)).toBe(doi);
  });

  test('truncates DOI over 42 chars with ellipsis', () => {
    const doi = '10.1234/' + 'a'.repeat(40);
    const result = truncateDoi(doi);
    expect(result.length).toBe(43); // 42 + ellipsis char
    expect(result.endsWith('…')).toBe(true);
  });
});

/* ── filterItems() ── */
describe('filterItems', () => {
  test('accepts items with long title and abstract', () => {
    const items = [{
      title: ['A sufficiently long title that exceeds twenty characters'],
      abstract: 'A'.repeat(81),
    }];
    expect(filterItems(items)).toHaveLength(1);
  });

  test('rejects items with short title', () => {
    const items = [{
      title: ['Short'],
      abstract: 'A'.repeat(81),
    }];
    expect(filterItems(items)).toHaveLength(0);
  });

  test('rejects items with short abstract', () => {
    const items = [{
      title: ['A sufficiently long title that exceeds twenty characters'],
      abstract: 'Short',
    }];
    expect(filterItems(items)).toHaveLength(0);
  });

  test('rejects items with missing title', () => {
    const items = [{ abstract: 'A'.repeat(81) }];
    expect(filterItems(items)).toHaveLength(0);
  });

  test('handles null/undefined input', () => {
    expect(filterItems(null)).toEqual([]);
    expect(filterItems(undefined)).toEqual([]);
  });
});

/* ── cleanAbstract() ── */
describe('cleanAbstract', () => {
  test('strips HTML tags', () => {
    expect(cleanAbstract('<p>Hello <b>world</b></p>')).toBe('Hello world');
  });

  test('collapses multiple whitespace', () => {
    expect(cleanAbstract('hello    world')).toBe('hello world');
  });

  test('handles empty/null input', () => {
    expect(cleanAbstract('')).toBe('');
    expect(cleanAbstract(null)).toBe('');
  });

  test('strips jats XML tags from Crossref abstracts', () => {
    const input = '<jats:p>This is a <jats:italic>scientific</jats:italic> abstract.</jats:p>';
    expect(cleanAbstract(input)).toBe('This is a scientific abstract.');
  });
});
