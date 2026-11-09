import type { Mode } from '../state';
import { pointsMode } from './score';

/** 탑 쌓기: 맞히면 중앙 카드를 가져와 탑에 쌓는다. score가 탑 높이다. 계산은 점수제와 같다 */
export const tower: Mode = pointsMode;
