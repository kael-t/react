/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Fiber} from './ReactFiber';

import invariant from 'shared/invariant';
import warningWithoutStack from 'shared/warningWithoutStack';

import {get as getInstance} from 'shared/ReactInstanceMap';
import ReactSharedInternals from 'shared/ReactSharedInternals';
import getComponentName from 'shared/getComponentName';
import {
  ClassComponent,
  HostComponent,
  HostRoot,
  HostPortal,
  HostText,
} from 'shared/ReactWorkTags';
import {NoEffect, Placement} from 'shared/ReactSideEffectTags';

const ReactCurrentOwner = ReactSharedInternals.ReactCurrentOwner;

const MOUNTING = 1;
const MOUNTED = 2;
const UNMOUNTED = 3;

// 判断一个Fiber的挂载状态, fiber往上寻找的根节点是HostRoot则为已挂载
function isFiberMountedImpl(fiber: Fiber): number {
  let node = fiber;
  if (!fiber.alternate) {
    // If there is no alternate, this might be a new tree that isn't inserted
    // yet. If it is, then it will have a pending insertion effect on it.
    // 如果没有alternate, 说明是一个没挂载的新树
    // 那么这棵树会有一个pending的插入effect
    if ((node.effectTag & Placement) !== NoEffect) {
      // 如果当前节点的effectTag包含了Placement(插入), 则说明是挂载中
      return MOUNTING;
    }
    // 没有alternate且祖先有Placement(插入)effectTag, 那也说明是挂载中
    // 一直回溯到根节点
    while (node.return) {
      node = node.return;
      if ((node.effectTag & Placement) !== NoEffect) {
        return MOUNTING;
      }
    }
  } else {
    // 有alternate, 说明是一棵挂载过的树, 则找到到根节点
    while (node.return) {
      node = node.return;
    }
  }
  // 如果根节点是HostRoot, 不管有无alternate, 就是已挂载
  // 目前没有判断通过renderContainerIntoSubtree的情况
  // 因为renderContainerIntoSubtree会使得整棵树会有两个以上hostRoot
  if (node.tag === HostRoot) {
    // TODO: Check if this was a nested HostRoot when used with
    // renderContainerIntoSubtree.
    return MOUNTED;
  }
  // If we didn't hit the root, that means that we're in an disconnected tree
  // that has been unmounted.
  // 如果不是HostRoot的话, 那这棵树就是被卸载了的
  return UNMOUNTED;
}

// 判断fiber挂载状态是不是MOUNTED
export function isFiberMounted(fiber: Fiber): boolean {
  return isFiberMountedImpl(fiber) === MOUNTED;
}

export function isMounted(component: React$Component<any, any>): boolean {
  if (__DEV__) {
    const owner = (ReactCurrentOwner.current: any);
    if (owner !== null && owner.tag === ClassComponent) {
      const ownerFiber: Fiber = owner;
      const instance = ownerFiber.stateNode;
      warningWithoutStack(
        instance._warnedAboutRefsInRender,
        '%s is accessing isMounted inside its render() function. ' +
          'render() should be a pure function of props and state. It should ' +
          'never access something that requires stale data from the previous ' +
          'render, such as refs. Move this logic to componentDidMount and ' +
          'componentDidUpdate instead.',
        getComponentName(ownerFiber.type) || 'A component',
      );
      instance._warnedAboutRefsInRender = true;
    }
  }

  const fiber: ?Fiber = getInstance(component);
  if (!fiber) {
    return false;
  }
  return isFiberMountedImpl(fiber) === MOUNTED;
}

// 如果fiber的挂载状态不是MOUNTED则报错
function assertIsMounted(fiber) {
  invariant(
    isFiberMountedImpl(fiber) === MOUNTED,
    'Unable to find node on an unmounted component.',
  );
}

// 找到传入fiber的currentFiber, 也就是传入fiber位于current树中的fiber
// 要么是它自己, 要么是它的alternate
export function findCurrentFiberUsingSlowPath(fiber: Fiber): Fiber | null {
  let alternate = fiber.alternate;
  // alternate不存在说明没有workInProgress树, 则这棵树就是current树
  // 这时候查看fiber是否已挂载, MOUNTING返回null, UNMOUNTED和MOUNTED返回传入的fiber
  if (!alternate) {
    // If there is no alternate, then we only need to check if it is mounted.
    // 获得fiber的挂载状态
    const state = isFiberMountedImpl(fiber);
    // 状态是UNMOUNTED报错
    invariant(
      state !== UNMOUNTED,
      'Unable to find node on an unmounted component.',
    );
    if (state === MOUNTING) {
      return null;
    }
    return fiber;
  }
  // If we have two possible branches, we'll walk backwards up to the root
  // to see what path the root points to. On the way we may hit one of the
  // special cases and we'll deal with them.
  // alternate存在, 则要判断a还是b在current树
  let a = fiber;
  let b = alternate;
  while (true) {
    let parentA = a.return;
    let parentB = parentA ? parentA.alternate : null;
    // 如果parentA或者parentB不存在, 则说明其中一棵树到顶了
    if (!parentA || !parentB) {
      // We're at the root.
      break;
    }

    // If both copies of the parent fiber point to the same child, we can
    // assume that the child is current. This happens when we bailout on low
    // priority: the bailed out fiber's child reuses the current child.

    // parentA.child和parentB的child是同一个, 则这个child就是currentFiber
    if (parentA.child === parentB.child) {
      let child = parentA.child;
      while (child) {
        // 如果child是a则传入的fiber在current树中
        if (child === a) {
          // We've determined that A is the current branch.
          assertIsMounted(parentA);
          return fiber;
        }
        // 如果child是b则alternate才是在current树中
        if (child === b) {
          // We've determined that B is the current branch.
          assertIsMounted(parentA);
          return alternate;
        }
        child = child.sibling;
      }
      // We should never have an alternate for any mounting node. So the only
      // way this could possibly happen is if this was unmounted, if at all.

      // 如果child的兄弟节点都遍历完都没有等于a或者b的, 则说明传入的fiber已经卸载了
      invariant(false, 'Unable to find node on an unmounted component.');
    }

    // 如果a.return和b.return不相同, 则断定他们永远不相交
    // FIXME: T: 为啥???
    if (a.return !== b.return) {
      // The return pointer of A and the return pointer of B point to different
      // fibers. We assume that return pointers never criss-cross, so A must
      // belong to the child set of A.return, and B must belong to the child
      // set of B.return.
      a = parentA;
      b = parentB;
    } else {
      // The return pointers point to the same fiber. We'll have to use the
      // default, slow path: scan the child sets of each parent alternate to see
      // which child belongs to which set.
      //
      // Search parent A's child set
      let didFindChild = false;
      let child = parentA.child;
      while (child) {
        if (child === a) {
          didFindChild = true;
          a = parentA;
          b = parentB;
          break;
        }
        if (child === b) {
          didFindChild = true;
          b = parentA;
          a = parentB;
          break;
        }
        child = child.sibling;
      }
      if (!didFindChild) {
        // Search parent B's child set
        child = parentB.child;
        while (child) {
          if (child === a) {
            didFindChild = true;
            a = parentB;
            b = parentA;
            break;
          }
          if (child === b) {
            didFindChild = true;
            b = parentB;
            a = parentA;
            break;
          }
          child = child.sibling;
        }
        invariant(
          didFindChild,
          'Child was not found in either parent set. This indicates a bug ' +
            'in React related to the return pointer. Please file an issue.',
        );
      }
    }

    invariant(
      a.alternate === b,
      "Return fibers should always be each others' alternates. " +
        'This error is likely caused by a bug in React. Please file an issue.',
    );
  }
  // If the root is not a host container, we're in a disconnected tree. I.e.
  // unmounted.
  invariant(
    a.tag === HostRoot,
    'Unable to find node on an unmounted component.',
  );
  if (a.stateNode.current === a) {
    // We've determined that A is the current branch.
    return fiber;
  }
  // Otherwise B has to be current branch.
  return alternate;
}

// 找到current树的hostFiber
export function findCurrentHostFiber(parent: Fiber): Fiber | null {
  // 找到parent在current树上的对应fiber
  const currentParent = findCurrentFiberUsingSlowPath(parent);
  if (!currentParent) {
    return null;
  }

  // Next we'll drill down this component to find the first HostComponent/Text.
  let node: Fiber = currentParent;
  // 由这个循环可以看出, 查找host节点是一个dfs的过程, 先从遍历到node.child
  // 然后再逐层往上回溯
  while (true) {
    if (node.tag === HostComponent || node.tag === HostText) {
      // 原生dom和文本直接返回node
      return node;
    } else if (node.child) {
      // 往下寻找host节点
      node.child.return = node;
      node = node.child;
      continue;
    }
    // 如果当前节点是currentParent, 也就是没找到host节点, 返回null
    if (node === currentParent) {
      return null;
    }
    // 没有兄弟节点就回到父节点
    // 但是如果父节点不存在/父节点是currentParent, 则返回null, 没找到host节点
    while (!node.sibling) {
      if (!node.return || node.return === currentParent) {
        return null;
      }
      node = node.return;
    }
    // 在兄弟节点找host节点
    node.sibling.return = node.return;
    node = node.sibling;
  }
  // Flow needs the return null here, but ESLint complains about it.
  // eslint-disable-next-line no-unreachable
  return null;
}

// 找到传入节点在current树上的hostFiber, 且路径上不能包含Portals
export function findCurrentHostFiberWithNoPortals(parent: Fiber): Fiber | null {
  const currentParent = findCurrentFiberUsingSlowPath(parent);
  if (!currentParent) {
    return null;
  }

  // Next we'll drill down this component to find the first HostComponent/Text.
  let node: Fiber = currentParent;
  while (true) {
    if (node.tag === HostComponent || node.tag === HostText) {
      return node;
    } else if (node.child && node.tag !== HostPortal) {
      node.child.return = node;
      node = node.child;
      continue;
    }
    if (node === currentParent) {
      return null;
    }
    while (!node.sibling) {
      if (!node.return || node.return === currentParent) {
        return null;
      }
      node = node.return;
    }
    node.sibling.return = node.return;
    node = node.sibling;
  }
  // Flow needs the return null here, but ESLint complains about it.
  // eslint-disable-next-line no-unreachable
  return null;
}
