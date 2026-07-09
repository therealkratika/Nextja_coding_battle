const dotenv = require("dotenv");
dotenv.config();

const connectDB = require("./src/config/db");
const Question = require("./src/model/question");

const categories = [
  "Arrays",
  "Strings",
  "Linked List",
  "Trees",
  "Graphs",
  "Dynamic Programming",
  "Greedy",
  "Math",
  "Binary Search",
  "Bit Manipulation",
  "Recursion",
  "HashMap",
  "Stack",
  "Queue",
  "Heap",
  "Sliding Window",
  "Backtracking",
  "Two Pointer",
];

const companies = ["Google", "Amazon", "Microsoft", "Meta", "Netflix", "Uber", "Dropbox", "Stripe", "Adobe", "Spotify"];

const patterns = [
  { title: "Balanced Subarray Finder", description: "Find the longest contiguous subarray whose sum is zero.", category: "Arrays", difficulty: "Medium", tags: ["prefix-sum", "subarray"] },
  { title: "Duplicate Value Detector", description: "Determine whether an array contains any duplicate values using a hash-based approach.", category: "HashMap", difficulty: "Easy", tags: ["hash-map", "set"] },
  { title: "String Palindrome Check", description: "Return whether a string reads the same forward and backward after ignoring non-alphanumeric characters.", category: "Strings", difficulty: "Easy", tags: ["string", "two-pointer"] },
  { title: "Binary Search in Rotated Array", description: "Find a target in a rotated sorted array using logarithmic search.", category: "Binary Search", difficulty: "Medium", tags: ["binary-search", "array"] },
  { title: "Top K Frequent Elements", description: "Return the k most frequent values from an array.", category: "Heap", difficulty: "Medium", tags: ["heap", "frequency"] },
  { title: "Island Count in Grid", description: "Count connected components of ones in a binary grid.", category: "Graphs", difficulty: "Medium", tags: ["dfs", "grid"] },
  { title: "Coin Change Combination Count", description: "Count the number of ways to make a target sum using a set of coin denominations.", category: "Dynamic Programming", difficulty: "Hard", tags: ["dp", "coins"] },
  { title: "Valid Parenthesis Sequence", description: "Check whether a string of brackets is balanced with a stack-based approach.", category: "Stack", difficulty: "Easy", tags: ["stack", "string"] },
  { title: "Merge Intervals", description: "Merge overlapping intervals into the minimum number of disjoint intervals.", category: "Arrays", difficulty: "Medium", tags: ["intervals", "sorting"] },
  { title: "Kth Largest Element", description: "Find the k-th largest element in an unsorted collection.", category: "Heap", difficulty: "Medium", tags: ["heap", "selection"] },
];

const questions = [];

function slugify(title) {
  return title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function buildStarterCode(language) {
  const starters = {
    cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n  ios::sync_with_stdio(false);\n  cin.tie(nullptr);\n  return 0;\n}`,
    java: `public class Solution {\n  public static void main(String[] args) {\n  }\n}`,
    python: `def solve():\n    pass\n\nif __name__ == "__main__":\n    solve()`,
    javascript: `function solve() {\n  // Write your solution here\n}\n\nsolve();`,
  };

  return starters[language] || "";
}

function buildExample(input, output, explanation) {
  return { input, output, explanation };
}

function buildTestCase(input, expectedOutput, explanation = "") {
  return { input, expectedOutput, explanation };
}

function buildQuestionTemplate(pattern, index) {
  const difficulty = pattern.difficulty;
  const category = pattern.category;
  const tags = [...pattern.tags, category.toLowerCase().replace(/\s+/g, "-")];
  const company = companies[index % companies.length];

  return {
    title: `${pattern.title} ${index}`,
    slug: `${slugify(pattern.title)}-${index}`,
    difficulty,
    description: `${pattern.description} Create an original solution that handles large inputs efficiently.`,
    examples: [
      buildExample("4\n1 2 3 4", "10", "Summing the values yields 10"),
      buildExample("3\n2 2 2", "6", "The total is 6"),
    ],
    constraints: [
      "1 <= n <= 10^5",
      "Values fit in 32-bit signed integers",
      "Use O(n) or O(log n) time where appropriate",
    ],
    category,
    companies: [company],
    timeLimit: difficulty === "Hard" ? 3000 : 2000,
    memoryLimit: 256,
    points: difficulty === "Easy" ? 100 : difficulty === "Medium" ? 150 : 200,
    supportedLanguages: ["C++", "Java", "Python", "JavaScript"],
    starterCode: {
      cpp: buildStarterCode("cpp"),
      java: buildStarterCode("java"),
      python: buildStarterCode("python"),
      javascript: buildStarterCode("javascript"),
    },
    sampleTestCases: [
      buildTestCase("2 3", "5", "Simple addition"),
      buildTestCase("10 20", "30", "Simple addition"),
    ],
    hiddenTestCases: [
      buildTestCase("1000000 2000000", "3000000", "Large input"),
      buildTestCase("-7 4", "-3", "Negative values"),
    ],
    tags,
    hints: ["Think about the core pattern first", "Try a small example by hand"],
    explanation: "This question is meant to test your understanding of the underlying algorithmic pattern.",
    editorial: "A clean approach uses the standard pattern for this problem family.",
    createdBy: "seed-script",
    isActive: true,
  };
}

for (let index = 1; index <= 100; index += 1) {
  const pattern = patterns[(index - 1) % patterns.length];
  questions.push(buildQuestionTemplate(pattern, index));
}

async function seedQuestions() {
  try {
    await connectDB();
    await Question.collection.dropIndexes();
    await Question.deleteMany({});
    await Question.insertMany(questions, { ordered: false });
    console.log(`Seeded ${questions.length} questions`);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

seedQuestions();
