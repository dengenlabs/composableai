import { Command } from "commander";
import { createObject, deleteObject, getObject, listObjects } from "./commands.js";

export function registerObjectsCommand(program: Command) {

    const store = program.command("content");

    store.command("post <file...>")
        .description("Post a new object to the store")
        .option('--name [name]', 'The name of the object to create. If not specified the file name will be used.')
        .option('--type [type]', 'The type of the object to create. If not specified the type will be inferred from the file content.')
        .option('--mime [mime]', 'The mime-type of the file content. If not specified the mime type will be inferred from the file name extension.')
        .option('--path [parentPath]', 'The path of the parent folder where the object is created. If not specified the object will be created in the root of the store.')
        .option('-r,--recursive', 'Recurse directory if the file argument is a directory. The defualt is to not recurse.')
        .action((files: string[], options: Record<string, any>) => {
            createObject(program, files, options);
        });
    store.command('delete <objectId>')
        .description("Delete an existing object given its ID")
        .action((objectId: string, options: Record<string, any>) => {
            deleteObject(program, objectId, options);
        });
    store.command('get <objectId>')
        .description("Get an existing object given its ID")
        .action((objectId: string, options: Record<string, any>) => {
            getObject(program, objectId, options);
        });
    store.command('list [folderPath]')
        .description("List the objects inside a folder. If no folder is specified all the obejcts are listed.")
        .option('-l,--limit [limit]', 'Limit the number of objects returned. The default limit is 100. Usefull for pagination.')
        .option('-s,--skip [skip]', 'Skip the number of objects to skip. Default is 0. Usefull for pagination.')
        .action((folderPath: string | undefined, options: Record<string, any>) => {
            listObjects(program, folderPath, options);
        });
}