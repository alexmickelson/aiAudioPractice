import { z } from "https://cdn.jsdelivr.net/npm/zod@3.24.4/+esm";
import zodToJsonSchema from "https://cdn.jsdelivr.net/npm/zod-to-json-schema@3.24.5/+esm";

let user = {
  name: "",
  age: 0,
  description: "",
  classes: ["Math", "Science", "History", "Art"],
};


const UpdateUserParams = z.object({
  name: z.string().min(1).describe("The user's full name"),
  age: z.number().int().nonnegative().describe("The user's age in years"),
  description: z.string().describe("A short bio or description"),
  classes: z.array(z.string()).describe("A list of classes"),
});

export function update_user(params) {
  user = UpdateUserParams.parse(params);

  renderUserForm();

  return user;
}

export function get_user() {
  return user;
}

export const updateUserJsonSchema = zodToJsonSchema(
  UpdateUserParams,
  "UpdateUserParams",
  { target: "openAi", allowedAdditionalProperties: false }
);

// Shared class strings
const inputClass =
  "block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100";
const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300";
const buttonClass =
  "w-full px-4 py-2 text-white bg-blue-600 rounded-md shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-400";

// Helper function to create labeled input fields
function createLabeledInput(
  labelText,
  inputType,
  inputId,
  inputName,
  value,
  placeholder
) {
  const div = document.createElement("div");

  const label = document.createElement("label");
  label.htmlFor = inputId;
  label.className = labelClass;
  label.textContent = labelText;

  const input = document.createElement("input");
  input.type = inputType;
  input.id = inputId;
  input.name = inputName;
  input.value = value;
  input.placeholder = placeholder;
  input.className = inputClass;

  div.appendChild(label);
  div.appendChild(input);

  return div;
}

function createLabeledTextarea(
  labelText,
  textareaId,
  textareaName,
  value,
  placeholder
) {
  const div = document.createElement("div");

  const label = document.createElement("label");
  label.htmlFor = textareaId;
  label.className = labelClass;
  label.textContent = labelText;

  const textarea = document.createElement("textarea");
  textarea.id = textareaId;
  textarea.name = textareaName;
  textarea.rows = 3;
  textarea.value = value;
  textarea.placeholder = placeholder;
  textarea.className = inputClass;

  div.appendChild(label);
  div.appendChild(textarea);

  return div;
}

function createClassList(classes) {
  const div = document.createElement("div");

  const label = document.createElement("label");
  label.htmlFor = "classList";
  label.className = labelClass;
  label.textContent = "Classes";

  const ul = document.createElement("ul");
  ul.id = "classList";
  ul.className = "mt-1 space-y-2";

  classes.forEach((className, index) => {
    const li = document.createElement("li");

    const input = document.createElement("input");
    input.type = "text";
    input.name = `class${index + 1}`;
    input.value = className;
    input.placeholder = "Enter class name";
    input.className = inputClass;

    li.appendChild(input);
    ul.appendChild(li);
  });

  div.appendChild(label);
  div.appendChild(ul);

  return div;
}

export function renderUserForm() {
  const formContainer = document.getElementById("testForm");
  if (!formContainer) return;

  // Clear the container
  formContainer.innerHTML = "";

  // Create form element
  const form = document.createElement("form");
  form.id = "userForm";
  form.className = "space-y-4";

  // Add fields to the form
  form.appendChild(
    createLabeledInput(
      "Name",
      "text",
      "nameInput",
      "name",
      user.name,
      "Enter full name"
    )
  );
  form.appendChild(
    createLabeledInput(
      "Age",
      "number",
      "ageInput",
      "age",
      user.age,
      "Enter age"
    )
  );
  form.appendChild(
    createLabeledTextarea(
      "Description",
      "descriptionInput",
      "description",
      user.description,
      "Short bio or description"
    )
  );
  form.appendChild(createClassList(user.classes));

  // Save button
  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.textContent = "Save";
  saveBtn.className = buttonClass;
  saveBtn.onclick = function submitForm() {
    // Gather form data
    const updatedUser = {
      name: document.getElementById("nameInput").value,
      age: Number(document.getElementById("ageInput").value),
      description: document.getElementById("descriptionInput").value,
      classes: Array.from(document.querySelectorAll("#classList input")).map(
        (input) => input.value
      ),
    };
    update_user(updatedUser);
  };

  form.appendChild(saveBtn);

  // Append form to container
  formContainer.appendChild(form);
}
renderUserForm();