import type { Rng } from '../rng';
import type { CompanionDef } from '../../data/companions';

export interface MilestoneChoice {
  kind: 'unlock' | 'upgrade';
  skillId: string;
}

// Toutes les options valides : débloquer une compétence (prérequis niveau 1 requis) ou faire
// évoluer une compétence débloquée (jusqu'à son max). Jamais d'option de niveau 2 sans le niveau 1.
export function validChoices(def: CompanionDef, skills: Record<string, number>): MilestoneChoice[] {
  const choices: MilestoneChoice[] = [];
  for (const skill of def.skills) {
    const level = skills[skill.id] ?? 0;
    if (level === 0) {
      const prereqOk = !skill.requires || (skills[skill.requires] ?? 0) >= 1;
      if (prereqOk) choices.push({ kind: 'unlock', skillId: skill.id });
    } else if (level < skill.maxLevel) {
      choices.push({ kind: 'upgrade', skillId: skill.id });
    }
  }
  return choices;
}

// 3 choix tirés au sort, seedé (§SPEC-7.2 — écran à la Hades).
export function pickMilestoneChoices(
  def: CompanionDef,
  skills: Record<string, number>,
  rng: Rng,
): MilestoneChoice[] {
  return rng.shuffle(validChoices(def, skills)).slice(0, 3);
}

export function applyChoice(
  skills: Record<string, number>,
  choice: MilestoneChoice,
  def: CompanionDef,
): Record<string, number> {
  const skill = def.skills.find((s) => s.id === choice.skillId);
  if (!skill) return skills;
  const level = skills[skill.id] ?? 0;
  if (choice.kind === 'unlock') {
    if (level > 0) return skills;
    if (skill.requires && (skills[skill.requires] ?? 0) < 1) return skills;
    return { ...skills, [skill.id]: 1 };
  }
  if (level === 0 || level >= skill.maxLevel) return skills;
  return { ...skills, [skill.id]: level + 1 };
}
