# Subarray problems: pattern cheat sheet

A complete cheat sheet with reusable C++ templates for 8 subarray patterns, then patterns 3, 4, 6 and 7 learned step by step.

The goal is to recognize the pattern from a problem statement, understand why it works, and write the code without memorizing an entire solution.

## Quick comparison

| Pattern | Main condition | Technique |
|---|---|---|
| 1. Fixed-size window | Exactly k elements | Add incoming, remove outgoing |
| 2. Variable-size window | Shortest or longest meeting a condition (non-negative sums) | Expand right, shrink left |
| 3. Prefix sum + map | Sum exactly k | Look up prefix - k |
| 4. Exactly K | Exactly k distinct values | Subtract two at-most counts |
| 5. Kadane | Maximum subarray sum | Extend or restart |
| 6. Monotonic deque | Shortest sum at least K, negatives allowed | Prefix sums + deque |
| 7. Advanced counting | Sum in [lower, upper] | Prefix sums + merge sort |
| 8. Binary search on answer / subarray DP | Minimize the largest part; extra constraints | Feasibility check; DP states |

Recommended learning order: master pattern 3 first, then pattern 4. Once those are comfortable, learn pattern 6, then pattern 7. Patterns 6 and 7 are more advanced, so focus on understanding their invariants before trying to memorize their code.

# Part 1: All 8 subarray patterns and templates

## 1. Fixed-size sliding window

**Use when:** every subarray must have exactly k elements.

```cpp
int fixedWindow(vector<int>& nums, int k) {
    int sum = 0, ans = INT_MIN;

    for (int i = 0; i < nums.size(); i++) {
        sum += nums[i];

        if (i >= k)
            sum -= nums[i - k];

        if (i >= k - 1)
            ans = max(ans, sum);
    }

    return ans;
}
```

- Core idea: add the new element, remove the outgoing element.
- Time: O(n); space: O(1).
- Example: LC 643, Maximum Average Subarray I.

## 2. Variable-size sliding window

**Use when:** find the shortest or longest subarray satisfying a condition, typically with non-negative numbers for sum-based conditions.

```cpp
int minSubarrayLen(vector<int>& nums, int target) {
    int left = 0, sum = 0;
    int ans = INT_MAX;

    for (int right = 0; right < nums.size(); right++) {
        sum += nums[right];

        while (sum >= target) {
            ans = min(ans, right - left + 1);
            sum -= nums[left++];
        }
    }

    return ans == INT_MAX ? 0 : ans;
}
```

- Core idea: expand right, shrink left while the condition holds.
- Time: O(n); space: O(1).
- Example: LC 209, Minimum Size Subarray Sum.

## 3. Prefix sum + hash map

**Use when:** count subarrays with sum exactly k, or use prefix-sum relationships to count valid subarrays.

```cpp
int subarraySum(vector<int>& nums, int k) {
    unordered_map<int, int> freq;
    freq[0] = 1;

    int prefix = 0, count = 0;

    for (int num : nums) {
        prefix += num;
        count += freq[prefix - k];
        freq[prefix]++;
    }

    return count;
}
```

- Core idea: current prefix minus previous prefix equals the subarray sum.
- Time: O(n) average; space: O(n).
- Example: LC 560, Subarray Sum Equals K.

## 4. Exactly K = At most K - At most K-1

**Use when:** count subarrays with exactly k distinct elements, or exactly k occurrences of a property that supports an at-most sliding window.

```cpp
int atMostK(vector<int>& nums, int k) {
    unordered_map<int, int> freq;
    int left = 0, count = 0;

    for (int right = 0; right < nums.size(); right++) {
        if (freq[nums[right]]++ == 0)
            k--;

        while (k < 0) {
            if (--freq[nums[left]] == 0)
                k++;
            left++;
        }

        count += right - left + 1;
    }

    return count;
}

int exactlyK(vector<int>& nums, int k) {
    return atMostK(nums, k) - atMostK(nums, k - 1);
}
```

- Core idea: subtract the number of subarrays with fewer than k distinct values.
- Time: O(n) average; space: O(n).
- Example: LC 992, Subarrays with K Different Integers.

## 5. Kadane's algorithm

**Use when:** find the maximum sum of a non-empty contiguous subarray.

```cpp
int maxSubArray(vector<int>& nums) {
    int current = nums[0];
    int best = nums[0];

    for (int i = 1; i < nums.size(); i++) {
        current = max(nums[i], current + nums[i]);
        best = max(best, current);
    }

    return best;
}
```

- Core idea: extend the current subarray or start a new one.
- Time: O(n); space: O(1).
- Example: LC 53, Maximum Subarray.

## 6. Monotonic deque + prefix sum

**Use when:** find the shortest subarray with sum at least k, even when negative numbers exist.

```cpp
int shortestSubarray(vector<int>& nums, int k) {
    int n = nums.size();
    vector<long long> prefix(n + 1, 0);

    for (int i = 0; i < n; i++)
        prefix[i + 1] = prefix[i] + nums[i];

    deque<int> dq;
    int ans = n + 1;

    for (int i = 0; i <= n; i++) {
        while (!dq.empty() &&
               prefix[i] - prefix[dq.front()] >= k) {
            ans = min(ans, i - dq.front());
            dq.pop_front();
        }

        while (!dq.empty() &&
               prefix[i] <= prefix[dq.back()]) {
            dq.pop_back();
        }

        dq.push_back(i);
    }

    return ans == n + 1 ? -1 : ans;
}
```

- Core idea: maintain candidate prefix indices in increasing prefix-sum order.
- Time: O(n); space: O(n).
- Example: LC 862, Shortest Subarray with Sum at Least K.

## 7. Advanced prefix-sum counting

**Use when:** count subarrays whose sums lie within a range, such as [lower, upper]. A common technique is merge-sort counting.

```cpp
long long countRangeSum(vector<int>& nums,
                        long long lower,
                        long long upper) {
    int n = nums.size();
    vector<long long> p(n + 1, 0);

    for (int i = 0; i < n; i++)
        p[i + 1] = p[i] + nums[i];

    vector<long long> temp(n + 1);

    function<long long(int, int)> solve =
        [&](int l, int r) -> long long {
        if (r - l <= 1) return 0;

        int m = l + (r - l) / 2;
        long long ans = solve(l, m) + solve(m, r);

        int lo = m, hi = m;

        for (int i = l; i < m; i++) {
            while (lo < r && p[lo] - p[i] < lower)
                lo++;
            while (hi < r && p[hi] - p[i] <= upper)
                hi++;
            ans += hi - lo;
        }

        int i = l, j = m, t = l;

        while (i < m && j < r)
            temp[t++] = p[i] <= p[j] ? p[i++] : p[j++];

        while (i < m) temp[t++] = p[i++];
        while (j < r) temp[t++] = p[j++];

        for (int x = l; x < r; x++)
            p[x] = temp[x];

        return ans;
    };

    return solve(0, n + 1);
}
```

- Core idea: count valid differences across the two sorted halves.
- Time: O(n log n); space: O(n).
- Example: LC 327, Count of Range Sum.

## 8. Binary search on the answer, and subarray DP

These are two related families, but they are not the same algorithm.

### A. Binary search on the answer

Use when minimizing the largest subarray sum, for example LC 410. With non-negative numbers, test a candidate maximum sum by greedily splitting the array.

```cpp
long long splitArray(vector<int>& nums, int m) {
    long long low = *max_element(nums.begin(), nums.end());
    long long high = accumulate(
        nums.begin(), nums.end(), 0LL
    );

    auto feasible = [&](long long limit) {
        int parts = 1;
        long long sum = 0;

        for (int x : nums) {
            if (sum + x > limit) {
                parts++;
                sum = x;
            } else {
                sum += x;
            }
        }

        return parts <= m;
    };

    while (low < high) {
        long long mid = low + (high - low) / 2;

        if (feasible(mid))
            high = mid;
        else
            low = mid + 1;
    }

    return low;
}
```

- Time: O(n log S), where S is the sum range.

### B. Subarray DP

Use when a subarray problem has extra constraints, such as one allowed deletion. For example, LC 1186.

```cpp
int maximumSum(vector<int>& arr) {
    int noDelete = arr[0];
    int oneDelete = INT_MIN / 2;
    int ans = arr[0];

    for (int i = 1; i < arr.size(); i++) {
        oneDelete = max(
            noDelete,
            oneDelete + arr[i]
        );

        noDelete = max(
            arr[i],
            noDelete + arr[i]
        );

        ans = max({ans, noDelete, oneDelete});
    }

    return ans;
}
```

- noDelete: best subarray ending here without a deletion.
- oneDelete: best subarray ending here with one deletion used.
- Time: O(n); space: O(1).

# Part 2: Learn patterns 3, 4, 6 and 7 properly

Each pattern is learned through four questions:

1. What problem does it solve?
2. What is the intuition?
3. How does the algorithm work on an example?
4. How do you recognize it in an interview?

## Pattern 3: Prefix sum + hash map

### Step 1: The basic idea

Suppose nums = [2, 1, 3] and k = 4. We want to count subarrays whose sum equals 4.

The brute-force approach checks every subarray. Prefix sums do better.

Define P[i] = nums[0] + ... + nums[i].

The sum of the subarray from index l to r is: sum(l, r) = P[r] - P[l-1].

For that sum to equal k: P[r] - P[l-1] = k, which rearranges to **P[l-1] = P[r] - k**.

This is the key: for every current prefix sum, count how many previous prefix sums equal currentPrefix - k.

### Step 2: Trace the example

Array [2, 1, 3], target 4.

| Element | Prefix | Need prefix | Count added |
|---|---|---|---|
| 2 | 2 | -2 | 0 |
| 1 | 3 | -1 | 0 |
| 3 | 6 | 2 | 1 |

The final prefix is 6. We need a previous prefix of 6 - 4 = 2. That prefix exists, and it represents the subarray [1, 3].

Answer: 1.

### Step 3: Why freq[0] = 1?

Consider nums = [1, 2, 3] and k = 6. The first time the prefix sum reaches 6, the whole array is a valid subarray. We need to count a previous prefix sum of zero, representing the empty prefix before the array begins.

```cpp
freq[0] = 1;
```

Without this initialization, subarrays starting at index 0 would be missed.

### Step 4: The reusable template

```cpp
int countSubarrays(vector<int>& nums, int k) {
    unordered_map<int, int> freq;
    freq[0] = 1;

    int prefix = 0;
    int count = 0;

    for (int x : nums) {
        prefix += x;

        count += freq[prefix - k];

        freq[prefix]++;
    }

    return count;
}
```

Notice the order:

1. Update the prefix sum.
2. Count matching previous prefixes.
3. Store the current prefix.

If you store the current prefix before counting, you can accidentally count an empty subarray when k = 0.

### Recognize it when

- You count subarrays with sum equal to k.
- The array contains negative numbers, so ordinary sum-based sliding windows won't work.
- You count subarrays with a particular prefix-sum difference.

Related problem: LC 560, Subarray Sum Equals K.

## Pattern 4: Exactly K = At most K - At most K-1

### Step 1: The problem

Suppose nums = [1, 2, 1, 2, 3] and k = 2. Count subarrays with exactly two distinct integers.

Some valid subarrays:

- [1, 2]
- [2, 1]
- [1, 2, 1]
- [2, 1, 2]
- [1, 2, 1, 2]

[2, 1, 2, 3] is not valid, because it has three distinct integers.

Counting exactly k directly is awkward, because a window can become invalid when it contains either too few or too many distinct values. Instead, count two easier quantities:

**exactly(k) = atMost(k) - atMost(k - 1)**

Why it works: every subarray with at most k distinct values belongs to one of two groups:

- subarrays with at most k - 1 distinct values, or
- subarrays with exactly k distinct values.

Subtract the first group from the total, and only the second remains.

### Step 2: Understand atMostK()

The sliding window maintains at most k distinct values.

```cpp
int atMostK(vector<int>& nums, int k) {
    unordered_map<int, int> freq;
    int left = 0;
    int count = 0;

    for (int right = 0; right < nums.size(); right++) {
        if (freq[nums[right]]++ == 0)
            k--;

        while (k < 0) {
            if (--freq[nums[left]] == 0)
                k++;

            left++;
        }

        count += right - left + 1;
    }

    return count;
}
```

Two details matter:

- When a value appears for the first time in the window, the number of distinct values increases.
- When its frequency drops to zero, that distinct value disappears.

The variable k here is the remaining distinct-value allowance, not the original target once the window starts moving.

### Step 3: Why count += right - left + 1?

Suppose the current valid window is [1, 2, 1]. The window ends at right, and its left boundary is left.

Every suffix ending at right that starts inside this window is also valid:

- [1]
- [2, 1]
- [1, 2, 1]

That's three subarrays: right - left + 1. Adding that number at each step counts all valid subarrays.

### Step 4: The final template

```cpp
int exactlyK(vector<int>& nums, int k) {
    return atMostK(nums, k)
         - atMostK(nums, k - 1);
}
```

This version of atMostK counts distinct integers. Other properties, such as the number of odd elements, need a matching at-most implementation.

### Recognize it when

- Exactly k distinct integers.
- Exactly k odd numbers.
- Exactly k occurrences of a property where the at-most counts can be computed efficiently.

Related problems: LC 992, Subarrays with K Different Integers; LC 1248, Count Number of Nice Subarrays.

## Pattern 6: Monotonic deque + prefix sum

This one is more advanced. The most important thing is understanding why an ordinary sliding window fails.

### Step 1: The problem

LC 862, Shortest Subarray with Sum at Least K.

Consider nums = [2, -1, 2] and k = 3. The answer is 3, because the entire array sums to 3.

An ordinary sliding window relies on predictable changes in the sum when elements are added or removed. Negative numbers break that assumption: adding a negative number can decrease the sum, and removing one can increase it. We need another approach.

### Step 2: Use prefix sums

Let the prefix sums include an initial zero: prefix = [0, 2, 1, 3].

A subarray from prefix index j to i has sum prefix[i] - prefix[j]. We want prefix[i] - prefix[j] >= k, which rearranges to **prefix[j] <= prefix[i] - k**.

As we process each ending index, we remove valid starting candidates from the front and record their lengths. The earliest valid candidate gives the longest of the valid lengths at this index, but it must be removed so that later candidates can give shorter lengths.

### Step 3: Why a monotonic deque?

Keep prefix indices in a deque, with their prefix sums in increasing order. There are two operations.

**A. Pop from the front.** If the current prefix minus the front prefix is at least k, we have found a valid subarray. Record its length, then remove that starting candidate, because it can only produce longer subarrays at future indices.

**B. Pop from the back.** If the current prefix sum is less than or equal to the prefix sum at the back, remove the back candidate. The current index is later, but its prefix sum is no larger, so it is a better starting candidate for any future ending index: it gives a shorter subarray and is at least as easy to satisfy.

**Deque invariant** (for prefix = [0, 2, 1, 3]):

| Index in deque | 0 | 2 | 3 |
|---|---|---|---|
| Prefix sum | 0 | 1 | 3 |

The indices increase from front to back, and their prefix sums increase strictly once dominated candidates are removed.

### Step 4: Template

The full C++ template is the one in pattern 6 above. Its key loop:

```cpp
while (!dq.empty() &&
       prefix[i] - prefix[dq.front()] >= k) {
    ans = min(ans, i - dq.front());
    dq.pop_front();
}

while (!dq.empty() &&
       prefix[i] <= prefix[dq.back()]) {
    dq.pop_back();
}

dq.push_back(i);
```

The first loop finds valid subarrays. The second removes dominated candidates. Finally, the current prefix index is added.

Time: O(n), because each index is inserted and removed at most once.

### Recognize it when

- Negative numbers are allowed.
- You need the shortest subarray whose sum is at least a target.
- A normal sliding window does not keep a reliable monotonic condition.

## Pattern 7: Advanced prefix-sum counting

### Step 1: The problem

LC 327, Count of Range Sum. Given an array and bounds lower and upper, count subarrays whose sums fall within that range, inclusive.

For example, nums = [-2, 5, -1], lower = -2, upper = 2. Valid subarrays:

- [-2], sum -2
- [-1], sum -1
- [-2, 5, -1], sum 2

Answer: 3.

### Step 2: Convert it into a prefix-sum problem

A subarray sum is prefix[j] - prefix[i]. We require lower <= prefix[j] - prefix[i] <= upper, which rearranges to:

**prefix[j] - upper <= prefix[i] <= prefix[j] - lower**

So the task is to count pairs of prefix sums whose difference lies within a range. A naive solution examines all pairs and takes O(n^2) time.

### Step 3: Use merge sort

Merge sort divides the prefix sums into two halves and sorts each half. For each prefix sum in the left half, count how many prefix sums in the right half fall within the required interval. Since the right half is sorted, two moving boundaries find that interval efficiently.

The key: the counting happens before the halves are merged.

1. Split all prefix sums into a left half and a right half.
2. Sort each half recursively.
3. Count cross-half pairs, using two moving boundaries in the sorted right half.
4. Merge the halves.

### Step 4: Why O(n log n)?

There are about log n levels of divide and conquer, and each level processes all prefix sums in linear time:

T(n) = 2T(n/2) + O(n) = O(n log n)

The full implementation is the template in pattern 7 above. Use long long for prefix sums and the answer to avoid integer overflow.

### Recognize it when

- You count subarrays with sums in [lower, upper].
- Negative numbers are allowed.
- The problem asks for range-based sum counting, and an O(n^2) solution is too slow.
