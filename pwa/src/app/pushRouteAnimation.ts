import {
  createAnimation,
  type AnimationBuilder,
  type TransitionOptions,
} from '@ionic/react'

const PUSH_DURATION_MS = 320

/** Moves both route surfaces together instead of sliding one over the other. */
export const pushRouteAnimation: AnimationBuilder = (
  _baseEl: HTMLElement,
  options: TransitionOptions,
) => {
  const isBack = options.direction === 'back'
  const enteringStart = isBack ? '-100%' : '100%'
  const leavingEnd = isBack ? '100%' : '-100%'

  const entering = createAnimation()
    .addElement(options.enteringEl)
    .beforeRemoveClass('ion-page-invisible')
    .fromTo('transform', `translate3d(${enteringStart}, 0, 0)`, 'translate3d(0, 0, 0)')

  const transition = createAnimation()
    .duration(PUSH_DURATION_MS)
    .easing('cubic-bezier(0.32, 0.72, 0, 1)')
    .addAnimation(entering)

  if (options.leavingEl) {
    transition.addAnimation(
      createAnimation()
        .addElement(options.leavingEl)
        .fromTo(
          'transform',
          'translate3d(0, 0, 0)',
          `translate3d(${leavingEnd}, 0, 0)`,
        ),
    )
  }

  return transition
}
