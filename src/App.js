import React, { useState, useEffect } from "react";
import "./App.css";
import { API, Storage } from "aws-amplify";
import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import { listTodos } from "./graphql/queries";
import {
  createTodo as createTodoMutation,
  deleteTodo as deleteTodoMutation,
} from "./graphql/mutations";

const initialFormState = { name: "", description: "" };

function App() {
  const [notes, setNotes] = useState([]);
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchNotes();
  }, []);

  async function fetchNotes() {
    const apiData = await API.graphql({ query: listTodos });
    const todosFromAPI = apiData.data.listTodos.items;
    await Promise.all(
      todosFromAPI.map(async (todo) => {
        if (todo.image) {
          const image = await Storage.get(todo.image);
          todo.image = image;
        }
        return todo;
      })
    );
    setNotes(apiData.data.listTodos.items);
  }

  async function createTodo() {
    if (!formData.name || !formData.description) return;
    await API.graphql({
      query: createTodoMutation,
      variables: { input: formData },
    });
    if (formData.image) {
      const image = await Storage.get(formData.image);
      formData.image = image;
    }
    setNotes([...notes, formData]);
    setFormData(initialFormState);
  }

  async function deleteTodo({ id }) {
    const newNotesArray = notes.filter((note) => note.id !== id);
    setNotes(newNotesArray);
    await API.graphql({
      query: deleteTodoMutation,
      variables: { input: { id } },
    });
  }

  async function onChange(e) {
    if (!e.target.files[0]) return;
    const file = e.target.files[0];
    setFormData({ ...formData, image: file.name });
    await Storage.put(file.name, file);
    fetchNotes();
  }

  return (
    <Authenticator>
      {({ signOut, user }) => (
        <div className="App">
          <h1>My Todo App</h1>
          <input
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Note name"
            value={formData.name}
          />
          <input
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Note description"
            value={formData.description}
          />
          <input type="file" onChange={onChange} />
          <button onClick={createTodo}>Create Todo</button>
          <div style={{ marginBottom: 30 }}>
            {notes.map((todo) => (
              <div key={todo.id || todo.name}>
                <h2>{todo.name}</h2>
                <p>{todo.description}</p>
                <button onClick={() => deleteTodo(todo)}>Delete todo</button>
                {todo.image && <img src={todo.image} style={{ width: 400 }} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </Authenticator>
  );
}

export default App;
