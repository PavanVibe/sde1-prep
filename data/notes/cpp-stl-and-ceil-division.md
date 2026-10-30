# C++ notes: `*max_element` and ceiling division

Added 30 Oct 2026 while learning LC 875 (Koko Eating Bananas). Reference material, not evidence.

## 1. `*max_element(v.begin(), v.end())`

**What it does:** finds the largest element in a range. It is in `<algorithm>`.

**It returns an iterator, not a value.** An iterator is like a pointer to the element's position.
Put `*` in front to dereference it and get the value.

```cpp
vector<int> piles = {3, 6, 7, 11};

auto it = max_element(piles.begin(), piles.end()); // iterator pointing at 11
int mx  = *it;                                     // 11 (the value)
int idx = it - piles.begin();                      // 3  (its index)

int hi = *max_element(piles.begin(), piles.end()); // the usual one-liner
```

**Why it returns an iterator:**
1. You get the position as well as the value. Use `it - v.begin()` for the index.
2. It is safe on an empty range: it returns `v.end()` ("not found"). Never dereference that.
3. One function works for every container (vector, list, set, arrays).

**Common mistake:** `int hi = max_element(...);` without `*` does not compile, because an iterator can't be stored in an `int`.

**Related functions that also return iterators (use `*` for the value):** `min_element`, `find`, `lower_bound`, `upper_bound`.
For a few literal values, `max({a, b, c})` returns the value directly.

## 2. Ceiling division: `(pile + k - 1) / k`

**Goal:** compute ⌈pile / k⌉ (divide and round **up**) using only integers.
C++ integer division rounds **down**: `7 / 3 = 2`, but eating 7 bananas at 3 per hour takes **3** hours.

**Logic.** Write pile = q·k + r, where q is the number of full hours and r is the leftover (0 ≤ r < k).
- If r = 0, we need **q** hours.
- If r > 0, we need **q + 1** hours.

Then (pile + k − 1) / k = q + (r + k − 1) / k, and the last part decides everything:
- r = 0: (k − 1) / k = **0**, so the total is q.
- r ≥ 1: k ≤ r + k − 1 ≤ 2k − 2 < 2k, so dividing by k gives exactly **1**, and the total is q + 1.

**Intuition:** k − 1 is the largest amount you can add without pushing an exact multiple of k past the next multiple.
Any leftover at all (even 1) gets pushed over, so integer "round down" turns into "round up".

| pile | k | pile / k | (pile + k − 1) / k |
|---|---|---|---|
| 6 | 3 | 2 | 8 / 3 = **2** |
| 7 | 3 | 2 | 9 / 3 = **3** |
| 8 | 3 | 2 | 10 / 3 = **3** |
| 9 | 3 | 3 | 11 / 3 = **3** |

**It is a calculator, not a check.** It always equals ⌈pile / k⌉. It is not a condition you need to satisfy.

**Overflow:** if `pile` is close to 10⁹ and `k` is large, `pile + k - 1` can overflow `int`. Write `(p + (long long)k - 1) / k`.

## 3. How these fit into LC 875 (binary search on the answer)

- **Search space:** speed k in [1, max(piles)]. At k = max, each pile takes 1 hour, and h ≥ n is guaranteed, so that speed always works.
- **Predicate:** `canFinish(k)` = sum over piles of ⌈pile / k⌉ ≤ h. Use `long long` for the sum (it can reach about 10¹³).
- The predicate is monotonic: F F F T T T … because a faster speed never takes more hours. Find the **first T**.
- In the loop: if `canFinish(mid)`, set `ans = mid` and `hi = mid - 1`; otherwise set `lo = mid + 1`.
- **Complexity:** O(n log M) time, where M = max(piles); O(1) extra space.
