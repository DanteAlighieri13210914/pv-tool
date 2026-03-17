// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under AGPL-3.0. For commercial use, see COMMERCIAL.md

import * as PIXI from 'pixi.js';
import { BaseEffect } from './base';
import type { UpdateContext } from '../core/types';
import initJieba, { cut as jiebaCut } from 'jieba-wasm';

// Jieba WASM 初始化状态
let jiebaInitialized = false;
let jiebaInitPromise: Promise<void> | null = null;

// 初始化 Jieba WASM（只执行一次）
async function ensureJiebaInitialized(): Promise<boolean> {
  if (jiebaInitialized) return true;
  
  if (!jiebaInitPromise) {
    jiebaInitPromise = initJieba().then(() => {
      jiebaInitialized = true;
      console.log('[HeartVoice] Jieba WASM 初始化成功');
    }).catch((err) => {
      console.warn('[HeartVoice] Jieba WASM 初始化失败，将使用字符分割:', err);
      jiebaInitPromise = null;
    });
  }
  
  await jiebaInitPromise;
  return jiebaInitialized;
}

// 日语助词集合
const JAPANESE_PARTICLES = new Set([
  // 单字符助词
  'は', 'が', 'を', 'に', 'で', 'と', 'の', 'へ', 'や', 'も', 'か', 'ね', 'よ', 'わ', 'な',
  // 复合助词
  'って', 'とは', 'には', 'では', 'にも', 'とも', 'への', 'での', 'まで', 'から', 'より',
]);

// 名词后缀（可与前面汉字名词合并的假名）
const NOUN_SUFFIXES = new Set([
  // 复数后缀
  'ら', 'たち', 'がた', 'ども',
]);

// 平假名和片假名的 Unicode 范围
const HIRAGANA_REGEX = /^[\u3040-\u309F]+$/;
const KATAKANA_REGEX = /^[\u30A0-\u30FF]+$/;

// 判断是否为纯假名（不含汉字、英文）
function isPureKana(text: string): boolean {
  if (!text) return false;
  return HIRAGANA_REGEX.test(text) || KATAKANA_REGEX.test(text);
}

// 判断是否可以与前面汉字词合并
function canMergeWithPrevWord(kana: string): boolean {
  return JAPANESE_PARTICLES.has(kana) || NOUN_SUFFIXES.has(kana);
}


interface WordItem {
  word: string;
  x: number;
  y: number;
  row: number;
  col: number;
  textObj: PIXI.Text;
}

export class HeartVoice extends BaseEffect {
  readonly name = 'heartVoice';
  private words: WordItem[] = [];
  private lastText = '';
  private initialized = false;
  private animT = 0;

  protected setup(): void {
    // 预初始化 Jieba WASM
    ensureJiebaInitialized();
  }

  private segmentText(text: string): string[] {
    let words: string[];
    
    if (jiebaInitialized) {
      try {
        const result = jiebaCut(text, true);
        if (result && result.length > 0) {
          words = result;
        } else {
          words = text.split('');
        }
      } catch (err) {
        console.warn('[HeartVoice] Jieba 分词失败:', err);
        words = text.split('');
      }
    } else {
      words = text.split('');
    }
    
    // Post-process: merge Japanese kana segments (jieba splits kana into single chars)
    words = this.mergeKanaSegments(words);
    // Post-process: merge punctuation-only words into previous word
    return this.mergePunctuationWords(words);
  }
  
  private mergePunctuationWords(words: string[]): string[] {
    if (words.length <= 1) return words;
    
    // Check if word contains only punctuation and whitespace
    const isPunctuationOnly = (w: string): boolean => {
      return /^[\s\p{P}\p{S}]+$/u.test(w);
    };
    
    const result: string[] = [];
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      
      if (isPunctuationOnly(word)) {
        // Merge into previous word if exists
        if (result.length > 0) {
          result[result.length - 1] += word;
        } else if (i < words.length - 1) {
          // First word is punctuation, merge into next word
          words[i + 1] = word + words[i + 1];
        }
      } else {
        result.push(word);
      }
    }
    
    return result;
  }

  /**
   * 合并日语假名片段
   * jieba 会将日语假名切分成单字符，需要智能合并
   * 规则：
   * 1. 连续假名序列合并为一个词
   * 2. 仅对助词和名词后缀与前面汉字词合并
   * 3. 动词活用词尾保持独立（如 えたの、ている）
   */
  private mergeKanaSegments(words: string[]): string[] {
    if (words.length <= 1) return words;
    
    const result: string[] = [];
    let kanaBuffer = '';
    
    for (const word of words) {
      if (isPureKana(word)) {
        // 假名：累积到缓冲区
        kanaBuffer += word;
      } else {
        // 非假名词（汉字、英文、标点等）
        // 先输出缓冲区，再输出当前词
        if (kanaBuffer) {
          result.push(kanaBuffer);
          kanaBuffer = '';
        }
        result.push(word);
      }
    }
    
    // 输出剩余缓冲区
    if (kanaBuffer) {
      result.push(kanaBuffer);
    }
    
    // 后处理：仅对助词和名词后缀与前面汉字词合并
    // 例如: ["僕", "ら"] → ["僕ら"]（名词后缀）
    // 例如: ["私", "は"] → ["私は"]（助词）
    // 例如: ["出会", "えたの"] → ["出会", "えたの"]（动词活用，保持独立）
    for (let i = result.length - 1; i >= 1; i--) {
      const current = result[i];
      const prev = result[i - 1];
      
      // 仅当：当前是假名 AND 前一个是非假名 AND 当前是可合并类型
      if (isPureKana(current) && !isPureKana(prev) && canMergeWithPrevWord(current)) {
        result[i - 1] = prev + current;
        result.splice(i, 1);
      }
    }
    
    return result;
  }

  private calculateCharWidth(char: string): number {
    // English letters count as 0.5, Chinese/Japanese as 1
    const englishRegex = /[a-zA-Z0-9]/;
    return englishRegex.test(char) ? 0.5 : 1;
  }

  private getTextWidth(text: string, fontSize: number): number {
    const style = new PIXI.TextStyle({
      fontFamily: '"Noto Serif JP", "Yu Mincho", serif',
      fontSize: fontSize,
      fontWeight: 'bold',
    });
    const textObj = new PIXI.Text({ text, style });
    const width = textObj.width;
    textObj.destroy();
    return width;
  }

  /**
 * 按斜杠分隔符拆分文本并对每个部分进行分词
 * @param text - 待拆分的文本，使用 '/' 作为分隔符
 * @returns 分词后的二维数组，每个元素对应一个分隔部分的分词结果
 */
private async splitWordsBySlash(text: string): Promise<string[][]> {
    // 确保 Jieba 已初始化
    await ensureJiebaInitialized();
    
    const parts = text.split('/');
    const result: string[][] = [];
    
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      
      const words = this.segmentText(trimmed);
      
      if (words.length > 0) {
        result.push(words);
      }
    }
    
    return result;
  }

  private layoutWords(sw: number, sh: number, words: string[]): { rows: string[][], wordItems: { word: string, row: number, col: number }[] } {
    const maxRows = Math.min(4, Math.floor(sh / 120));
    const minWordsPerRow = 2;
    const fontSize = this.config.fontSize ?? 80;
    
    // Calculate word character widths
    const wordCharWidths: number[] = words.map(w => 
      w.split('').reduce((sum, c) => sum + this.calculateCharWidth(c), 0)
    );
    const totalChars = wordCharWidths.reduce((sum, w) => sum + w, 0);
    
    // Estimate max chars per row based on screen width
    const padding = fontSize * 0.3;
    const maxCharsPerRow = Math.floor((sw - padding * 2) / fontSize * 1.2);
    
    // Determine number of rows
    const wordCount = words.length;
    const rowsByWidth = Math.ceil(totalChars / maxCharsPerRow);
    const rowsByWords = Math.ceil(wordCount / minWordsPerRow);
    
    let numRows = Math.max(1, Math.min(maxRows, Math.max(rowsByWidth, rowsByWords)));
    numRows = Math.min(numRows, wordCount);
    
    // Distribute words into rows using balanced approach
    const rows: string[][] = Array.from({ length: numRows }, () => []);
    const targetCharsPerRow = Math.min(maxCharsPerRow, Math.ceil(totalChars / numRows));
    
    // Track character counts per row
    const rowChars: number[] = Array(numRows).fill(0);
    let currentRow = 0;
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const wordChars = wordCharWidths[i];
      
      // Check if we should move to next row
      if (currentRow < numRows - 1 && rowChars[currentRow] > 0) {
        const remainingChars = wordCharWidths.slice(i).reduce((sum, w) => sum + w, 0);
        const remainingRows = numRows - currentRow;
        const avgCharsPerRemainingRow = remainingChars / remainingRows;
        
        // Move to next row if current row exceeds target AND
        // remaining chars can reasonably fill remaining rows
        if (rowChars[currentRow] >= targetCharsPerRow * 0.8 &&
            remainingChars >= avgCharsPerRemainingRow * 0.6) {
          currentRow++;
        }
      }
      
      rows[currentRow].push(word);
      rowChars[currentRow] += wordChars;
    }
    
    // Post-process: balance rows that are too imbalanced
    // If first row has very few chars compared to others, redistribute
    if (rows.length >= 2) {
      const firstRowChars = rowChars[0];
      const otherRowChars = rowChars.slice(1).filter(c => c > 0);
      const avgOtherChars = otherRowChars.length > 0 
        ? otherRowChars.reduce((a, b) => a + b, 0) / otherRowChars.length 
        : 0;
      
      // If first row is much smaller than average, try to move words from second row
      if (firstRowChars > 0 && avgOtherChars > 0 && firstRowChars < avgOtherChars * 0.5) {
        if (rows[1] && rows[1].length > minWordsPerRow) {
          const wordsToMove = Math.ceil(rows[1].length / 2);
          rows[0].push(...rows[1].splice(0, wordsToMove));
        }
      }
    }
    
    // Ensure each row has at least minWordsPerRow words
    for (let i = rows.length - 1; i >= 1; i--) {
      if (rows[i].length > 0 && rows[i].length < minWordsPerRow) {
        rows[i - 1].push(...rows[i]);
        rows[i] = [];
      }
    }
    const finalRows = rows.filter(r => r.length > 0);
    
    // Create word items with row/col info
    const wordItems: { word: string, row: number, col: number }[] = [];
    for (let row = 0; row < finalRows.length; row++) {
      for (let col = 0; col < finalRows[row].length; col++) {
        wordItems.push({
          word: finalRows[row][col],
          row,
          col
        });
      }
    }
    
    return { rows: finalRows, wordItems };
  }

  private async createWordObjects(sw: number, sh: number, text: string): Promise<void> {
    // Clear existing
    for (const w of this.words) {
      w.textObj.destroy();
    }
    this.words = [];
    
    // Get words grouped by slash
    const slashGroups = await this.splitWordsBySlash(text);
    
    if (slashGroups.length === 0) return;
    
    let allWordItems: { word: string, row: number, col: number, groupIndex: number }[] = [];
    
    if (slashGroups.length === 1) {
      const words = slashGroups[0];
      const { wordItems } = this.layoutWords(sw, sh, words);
      allWordItems = wordItems.map(w => ({ ...w, groupIndex: 0 }));
    } else {
      // Multiple groups: each slash-separated group gets max 2 rows
      let globalRow = 0;
      for (let g = 0; g < slashGroups.length; g++) {
        const words = slashGroups[g];
        
        if (words.length === 0) continue;
        
        // Calculate character widths for balanced split
        const wordCharWidths = words.map(w => 
          w.split('').reduce((sum, c) => sum + this.calculateCharWidth(c), 0)
        );
        const totalChars = wordCharWidths.reduce((sum, w) => sum + w, 0);
        
        if (words.length <= 3) {
          // Few words: put all on one row
          for (let i = 0; i < words.length; i++) {
            allWordItems.push({
              word: words[i],
              row: globalRow,
              col: i,
              groupIndex: g
            });
          }
          globalRow += 1;
        } else {
          // Many words: split into exactly 2 rows with balanced character count
          const targetCharsPerRow = totalChars / 2;
          let splitIndex = 0;
          let currentChars = 0;
          
          // Find split point: first position where accumulated chars >= target
          for (let i = 0; i < words.length - 1; i++) {
            currentChars += wordCharWidths[i];
            if (currentChars >= targetCharsPerRow) {
              splitIndex = i + 1;
              break;
            }
            splitIndex = i + 1;
          }
          
          // Ensure each row has at least 2 words
          splitIndex = Math.max(2, Math.min(splitIndex, words.length - 2));
          
          // Add row 0 words
          for (let i = 0; i < splitIndex; i++) {
            allWordItems.push({
              word: words[i],
              row: globalRow,
              col: i,
              groupIndex: g
            });
          }
          // Add row 1 words
          for (let i = splitIndex; i < words.length; i++) {
            allWordItems.push({
              word: words[i],
              row: globalRow + 1,
              col: i - splitIndex,
              groupIndex: g
            });
          }
          globalRow += 2;
        }
      }
    }
    
    // Calculate positions
    const baseFontSize = this.config.fontSize ?? 80;
    const style2Scale = this.config.style2Scale ?? 1.4;
    const style1Size = baseFontSize;
    const style2Size = baseFontSize * style2Scale;
    const padding = baseFontSize * 0.15;
    
    const style1Color = this.config.style1Color ?? '#000000';
    const style2Color = this.config.style2Color ?? '#ffffff';
    
    // Group by rows first
    const rows: { [key: number]: typeof allWordItems } = {};
    for (const w of allWordItems) {
      if (!rows[w.row]) rows[w.row] = [];
      rows[w.row].push(w);
    }
    
    // Estimate max row width with base font size
    let maxRowWidth = 0;
    for (const row of Object.keys(rows)) {
      const r = parseInt(row);
      const rowWords = rows[r];
      let width = 0;
      for (const ww of rowWords) {
        const size = (r + ww.col) % 2 === 0 ? style1Size : style2Size;
        width += this.getTextWidth(ww.word, size) + padding;
      }
      maxRowWidth = Math.max(maxRowWidth, width);
    }
    
    // Calculate scale factor to fit within screen
    const maxWidth = sw * 0.9;
    const widthScale = maxRowWidth > maxWidth ? maxWidth / maxRowWidth : 1;
    const finalFontSize = baseFontSize * widthScale;
    const finalStyle1Size = finalFontSize;
    const finalStyle2Size = finalFontSize * style2Scale;
    
    // Calculate row height with final size
    const rowHeight = finalStyle2Size * 1.1;
    const baseY = sh / 2 - (Math.max(...allWordItems.map(w => w.row)) + 1) * rowHeight / 2;
    
    // Assign sizes to words
    const wordSizes: Map<string, number> = new Map();
    for (const w of allWordItems) {
      const rowSum = w.row + w.col;
      const isStyle1 = rowSum % 2 === 0;
      wordSizes.set(`${w.row}-${w.col}-${w.word}`, isStyle1 ? finalStyle1Size : finalStyle2Size);
    }
    
    // Recalculate row widths with final sizes
    const rowWidths: { [key: number]: number } = {};
    for (const row of Object.keys(rows)) {
      const r = parseInt(row);
      const rowWords = rows[r];
      let width = 0;
      for (const ww of rowWords) {
        const size = wordSizes.get(`${r}-${ww.col}-${ww.word}`) || finalFontSize;
        width += this.getTextWidth(ww.word, size) + padding;
      }
      rowWidths[r] = width;
    }
    
    // Create text objects
    for (const w of allWordItems) {
      const rowSum = w.row + w.col;
      const isStyle1 = rowSum % 2 === 0;
      const size = wordSizes.get(`${w.row}-${w.col}-${w.word}`) || finalFontSize;
      const color = isStyle1 ? style1Color : style2Color;
      
      const style = new PIXI.TextStyle({
        fontFamily: '"Noto Serif JP", "Yu Mincho", serif',
        fontSize: size,
        fill: color,
        fontWeight: 'bold',
      });
      
      let filters: PIXI.Filter[] = [];
      if (!isStyle1) {
        const blur = new PIXI.BlurFilter();
        blur.blur = this.config.blur ?? 4;
        filters = [blur];
      }
      
      const textObj = new PIXI.Text({ text: w.word, style });
      textObj.anchor.set(0.5);
      textObj.filters = filters;
      
      const rowWords = rows[w.row];
      const rowWidth = rowWidths[w.row];
      let xOffset = sw / 2 - rowWidth / 2;
      
      for (let i = 0; i < w.col; i++) {
        const prevWord = rowWords[i];
        const prevSize = wordSizes.get(`${w.row}-${i}-${prevWord.word}`) || finalFontSize;
        xOffset += this.getTextWidth(prevWord.word, prevSize) + padding;
      }
      
      const sizeDiff = finalStyle2Size - size;
      const yOffset = sizeDiff * 0.3;
      
      textObj.x = xOffset + this.getTextWidth(w.word, size) / 2;
      textObj.y = baseY + w.row * rowHeight + yOffset;
      
      textObj.alpha = 0;
      
      this.container.addChild(textObj);
      this.words.push({
        word: w.word,
        x: textObj.x,
        y: textObj.y,
        row: w.row,
        col: w.col,
        textObj
      });
    }
  }

  update(ctx: UpdateContext): void {
    const sw = ctx.screenWidth;
    const sh = ctx.screenHeight;
    
    // Re-layout on text change
    if (ctx.currentText && ctx.currentText !== this.lastText) {
      this.lastText = ctx.currentText;
      this.animT = 0;
      this.createWordObjects(sw, sh, ctx.currentText).then(() => {
        this.initialized = true;
      });
    }
    
    if (!this.initialized || this.words.length === 0) return;
    
    // Sort words by row then column for sequential reveal
    const sortedWords = [...this.words].sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row;
      return a.col - b.col;
    });
    
    // Animation settings
    const staggerDelay = this.config.staggerDelay ?? 0.3;
    const spd = ctx.animationSpeed;
    const beatPulse = ctx.beatIntensity * 0.06;
    
    // Accumulate animation time
    this.animT += ctx.deltaTime * spd * 2.5;
    
    for (let i = 0; i < sortedWords.length; i++) {
      const w = sortedWords[i];
      const delay = i * staggerDelay;
      
      const t = Math.max(0, this.animT - delay * spd);
      
      if (t <= 0) {
        w.textObj.alpha = 0;
        w.textObj.scale.set(0);
        continue;
      }
      
      const progress = Math.min(1, t / 0.6);
      
      // Elastic ease-out
      const p = progress;
      const elastic = p === 0 ? 0 : p === 1 ? 1
        : Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * (2 * Math.PI / 3)) + 1;
      
      const targetScale = elastic * 1.05 + beatPulse;
      w.textObj.scale.set(targetScale);
      
      w.textObj.alpha = Math.min(1, t * 3);
    }
  }
}
