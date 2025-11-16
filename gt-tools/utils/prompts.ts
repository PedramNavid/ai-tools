import confirm from "@inquirer/confirm";

/**
 * Ask user for yes/no confirmation
 */
export async function askConfirmation(message: string, defaultValue: boolean = false): Promise<boolean> {
  return await confirm({
    message,
    default: defaultValue,
  });
}

/**
 * Display a preview of changes and ask for confirmation
 */
export async function previewAndConfirm(
  title: string,
  content: string,
  confirmMessage: string = "Do you want to proceed?"
): Promise<boolean> {
  console.log(`\n${title}`);
  console.log("─".repeat(50));
  console.log(content);
  console.log("─".repeat(50));

  return await askConfirmation(confirmMessage, true);
}
