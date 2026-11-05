import type { Rng } from '../rng';
import type { CompanionDef } from '../../data/companions';

export interface MilestoneChoice {
  kind: 'unlock' | 'upgrade';
  skillId: string;
}

// R11-02 (E2) : déblocage par palier de lien — une compétence se débloque quand le
// palier de lien atteint `unlockTier` (jamais de prérequis en chaîne `requires`).
// Les jalons donnent de l'XP de lien mais ne débloquent plus de compétence dont le
// palier n'est pas atteint ; 'upgrade' reste proposé pour les compétences débloquées.
export function validChoices(def: CompanionDef, skills: Record<string, number>, bondTier: number): MilestoneChoice[] {
  const choices: MilestoneChoice[] = [];
  for (const skill of def.skills) {
    const level = skills[skill.id] ?? 0;
    if (level === 0) {
      if (bondTier >= skill.unlockTier) choices.push({ kind: 'unlock', skillId: skill.id });
    } else if (level < skill.maxLevel) {
      choices.push({ kind: 'upgrade', skillId: skill.id });
    }
  }
  return choices;
}

// 3 choix tirés au sort, seedés (§SPEC-7.2 — écran à la Hades).
export function pickMilestoneChoices(
  def: CompanionDef,
  skills: Record<string, number>,
  rng: Rng,
  bondTier = 1,
): MilestoneChoice[] {
  return rng.shuffle(validChoices(def, skills, bondTier)).slice(0, 3);
}

export function applyChoice(
  skills: Record<string, number>,
  choice: MilestoneChoice,
  def: CompanionDef,
  bondTier = 1,
): Record<string, number> {
  const skill = def.skills.find((s) => s.id === choice.skillId);
  if (!skill) return skills;
  const level = skills[skill.id] ?? 0;
  if (choice.kind === 'unlock') {
    if (level > 0) return skills;
    if (bondTier < skill.unlockTier) return skills;
    return { ...skills, [skill.id]: 1 };
  }
  if (level === 0 || level >= skill.maxLevel) return skills;
  return { ...skills, [skill.id]: level + 1 };
}
