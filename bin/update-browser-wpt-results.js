// Update the reported WPT results in README.md for the latest browser versions
// Skips WPT runs that are irrelevant to fake-indexeddb
/* global fetch URLSearchParams await console */

const runs = await (
    await fetch(
        "https://wpt.fyi/api/runs?" +
            new URLSearchParams(
                Object.entries({
                    labels: "master",
                    product: ["chrome", "firefox", "safari", "ladybird"],
                    max_count: 1,
                })
                    // flatMap to allow for multiple product=foo pairs
                    .flatMap(([key, value]) =>
                        Array.isArray(value)
                            ? value.map((v) => [key, v])
                            : [[key, value]],
                    ),
            ),
    )
).json();

const browsers = runs.map((_) => ({
    name:
        _.browser_name.substring(0, 1).toUpperCase() +
        _.browser_name.substring(1),
    version: _.browser_version,
}));

const { results: testResults } = await (
    await fetch("https://wpt.fyi/api/search", {
        method: "POST",
        body: JSON.stringify({
            run_ids: runs.map((_) => _.id),
            query: {
                path: "/IndexedDB",
            },
        }),
    })
).json();

const filteredTestResults = testResults
    // filter based on tests that are irrelevant to Node.js, e.g. worker/cross-origin tests
    .filter(({ test }) => {
        return !/\.(worker|serviceworker|sharedworker)\.html$/.test(test);
    })
    .map((result) => {
        // convert to our test naming format
        return {
            ...result,
            test: result.test
                .replace(/^\/IndexedDB\//, "")
                .replace(/\.html$/, ".js"),
        };
    })
    .sort((a, b) => (a.test < b.test ? -1 : 1));

const browserResultsSummaries = browsers.map(({ name, version }, i) => {
    const passed = filteredTestResults
        .map((_) => _.legacy_status[i].passes)
        .reduce((a, b) => a + b, 0);
    const total = filteredTestResults
        .map((_) => _.legacy_status[i].total)
        .reduce((a, b) => a + b, 0);
    return {
        name,
        version,
        passed,
        total,
    };
});

// print markdown table
console.log("| Implementation | Passed | Total | % |");
for (const { name, version, passed, total } of browserResultsSummaries) {
    console.log(
        `| ${name} (version ${version}) | ${passed} | ${total} | ${Math.round((1000 * passed) / total) / 10}% |`,
    );
}
