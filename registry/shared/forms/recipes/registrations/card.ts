import { cardSpec, defineFormRecipe } from '@schema-engine/forms/recipes';
import { StepHeader } from '../blocks/step-header';
import { CardShell } from '../shells/card-shell';

export const CardRecipe = defineFormRecipe(cardSpec, { shell: CardShell, slots: { header: StepHeader } });
