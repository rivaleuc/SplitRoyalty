import { createSignal, For } from "solid-js";
import { render } from "solid-js/web";

function App() {
  const [title, setTitle] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [contributors, setContributors] = createSignal([{ name: "", role: "" }]);
  const [result, setResult] = createSignal(null);

  const addContributor = () => setContributors([...contributors(), { name: "", role: "" }]);

  const updateContributor = (i, field, value) => {
    const c = [...contributors()];
    c[i] = { ...c[i], [field]: value };
    setContributors(c);
  };

  const submit = async () => {
    const payload = {
      title: title(),
      contributors_json: JSON.stringify(contributors()),
      description: description(),
    };
    // POST to GenLayer contract endpoint
    const res = await fetch("/api/create_project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setResult(data);
  };

  return (
    <div style={{ "max-width": "600px", margin: "2rem auto", "font-family": "sans-serif" }}>
      <h1>SplitRoyalty</h1>
      <input placeholder="Project title" value={title()} onInput={(e) => setTitle(e.target.value)} style={{ width: "100%", padding: "8px", "margin-bottom": "8px" }} />
      <textarea placeholder="Description" value={description()} onInput={(e) => setDescription(e.target.value)} style={{ width: "100%", padding: "8px", "margin-bottom": "8px" }} />
      <h3>Contributors</h3>
      <For each={contributors()}>
        {(c, i) => (
          <div style={{ display: "flex", gap: "8px", "margin-bottom": "4px" }}>
            <input placeholder="Name" value={c.name} onInput={(e) => updateContributor(i(), "name", e.target.value)} />
            <input placeholder="Role" value={c.role} onInput={(e) => updateContributor(i(), "role", e.target.value)} />
          </div>
        )}
      </For>
      <button onClick={addContributor}>+ Contributor</button>
      <button onClick={submit} style={{ "margin-left": "8px" }}>Create & Judge Splits</button>
      {result() && <pre style={{ "margin-top": "1rem", background: "#f4f4f4", padding: "1rem" }}>{JSON.stringify(result(), null, 2)}</pre>}
    </div>
  );
}

render(() => <App />, document.getElementById("app"));
