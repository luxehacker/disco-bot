import { useFieldArray, useForm } from "react-hook-form";
import { Input, Label, FormRow } from "./components/form";
import { useEffect } from "react";

import Styles from "./app.module.scss";

type FormValues = {
  headingText: string;
  subheadingText?: string;
  bulletPoints: { text: string; url?: string }[];
  buttonCheckbox: false;
  button: { text: string; url: string }[];
};

function App() {
  const {
    watch,
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: { buttonCheckbox: false } });

  const bulletPointsField = useFieldArray({
    control,
    name: "bulletPoints",
  });

  const buttonsField = useFieldArray({
    control,
    name: "button",
  });
  const isButtonCheckboxChecked = watch("buttonCheckbox");

  useEffect(() => {
    fetch("http://localhost:3000/emojis")
      .then((res) => res.json())
      .then((data) => {
        console.log("Emojis from server:", data);
      })
      .catch((error) => {
        console.error("Error fetching emojis:", error);
      });

    fetch("http://localhost:3000/roles")
      .then((res) => res.json())
      .then((data) => {
        console.log("Roles from server:", data);
      })
      .catch((error) => {
        console.error("Error fetching roles:", error);
      });
  }, []);

  useEffect(() => {
    if (isButtonCheckboxChecked) {
      buttonsField.append({ text: "", url: "" });
    } else {
      buttonsField.fields.forEach((_, index) => {
        buttonsField.remove(index);
      });
    }
  }, [isButtonCheckboxChecked]);

  async function sendDiscordMessage(values: FormValues) {
    const { bulletPoints: list, ...rest } = values;
    console.log("values", { list, ...rest });

    try {
      const response = await fetch("http://localhost:3000/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // To do: map over buttons on back end
          data: {
            ...rest,
            list,
            button: values.button[0],
            // headingEmoji: "Sparkle",
            // bulletEmoji: "BulletGreen",
          },
          channelId: undefined,
        }),
      });
      const result = await response.json();
      alert(result.success ? "Sent!" : `Error: ${result.error}`);
    } catch (error) {
      alert("Network error: " + error);
    }
  }

  return (
    <div className={Styles.siteWrapper}>
      <div className={Styles.innerWrapper}>
        <h1 className={Styles.heading}>Luxe Discord Bot</h1>

        <form
          className={Styles.form}
          onSubmit={handleSubmit(sendDiscordMessage)}
        >
          {/*Heading*/}
          <FormRow>
            <Label text="Heading text" id="heading" />
            <Input
              id="heading"
              name="headingText"
              required={true}
              register={register}
            />
            {errors.headingText && (
              <span className={Styles.error}>This field is required</span>
            )}
          </FormRow>

          {/*Subheading*/}
          <FormRow>
            <Label text="Subheading text" id="subheading" />
            <Input id="subheading" name="subheadingText" register={register} />
          </FormRow>

          {!bulletPointsField.fields.length && (
            <button
              className={Styles.button}
              type="button"
              onClick={() => bulletPointsField.append({ text: "", url: "" })}
            >
              Add bullet points
            </button>
          )}

          {/* Bullet Points */}
          {bulletPointsField.fields.length > 0 && (
            <div className={Styles.bulletPointsContainer}>
              {bulletPointsField.fields.map((field, index) => (
                <FormRow>
                  <div key={field.id} className={Styles.bulletPointRow}>
                    <div className={Styles.bulletPointTextRow}>
                      <div className={Styles.bulletPoint}>
                        <Label text="Bullet text" id={`bullet-${index}`} />
                        <Input
                          id={`bullet-${index}`}
                          name={`bulletPoints.${index}.text`}
                          required={true}
                          register={register}
                        />
                      </div>
                    </div>

                    <div className={Styles.bulletPointUrlRow}>
                      <div className={Styles.bulletPoint}>
                        <Label text="Bullet url" id={`bullet-${index}`} />
                        <div className={Styles.bulletPointButtonRow}>
                          <Input
                            id={`bullet-${index}`}
                            name={`bulletPoints.${index}.url`}
                            register={register}
                          />

                          {index > 0 && (
                            <button
                              className={Styles.removeButton}
                              type="button"
                              onClick={() => bulletPointsField.remove(index)}
                            >
                              - Remove
                            </button>
                          )}

                          {index === bulletPointsField.fields.length - 1 && (
                            <button
                              className={Styles.addButton}
                              type="button"
                              onClick={() =>
                                bulletPointsField.append({ text: "", url: "" })
                              }
                            >
                              + Add
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  {errors.bulletPoints?.[index]?.text && (
                    <span className={Styles.error}>Text is required</span>
                  )}
                </FormRow>
              ))}
            </div>
          )}

          {/* Button */}

          <FormRow marginTop="large" horizontal>
            <Label text="Do you want to add a button?" id="buttonCheckbox">
              <div className={Styles.checkboxWrapper}>
                <Input
                  id="buttonCheckbox"
                  name="buttonCheckbox"
                  register={register}
                  type="checkbox"
                  value="true"
                />
              </div>
            </Label>
          </FormRow>

          {isButtonCheckboxChecked &&
            buttonsField.fields.map((field, index) => (
              <div key={field.id} className={Styles.bulletPointsContainer}>
                <FormRow marginTop="large">
                  <Label text="Button text" id={`button-text-${index}`} />
                  <Input
                    id={`button-text-${index}`}
                    name={`button.${index}.text`}
                    required={true}
                    register={register}
                  />
                  {errors.button?.[index]?.text && (
                    <span className={Styles.error}>This field is required</span>
                  )}
                </FormRow>

                <FormRow>
                  <Label text="Button URL" id={`button-url-${index}`} />
                  <Input
                    id={`button-url-${index}`}
                    name={`button.${index}.url`}
                    required={true}
                    register={register}
                  />
                  {errors.button?.[index]?.url && (
                    <span className={Styles.error}>This field is required</span>
                  )}
                </FormRow>
              </div>
            ))}

          {!!bulletPointsField.fields.length && (
            <button className={Styles.button} type="submit">
              Send Discord Message
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

export default App;
