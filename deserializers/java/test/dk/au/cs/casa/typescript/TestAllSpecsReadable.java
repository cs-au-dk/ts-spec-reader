package dk.au.cs.casa.typescript;

import org.junit.Test;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintStream;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.Assert.assertNotNull;

public class TestAllSpecsReadable {

    private void test(String mode) {
        Path jsonPath = null;
        try {
            jsonPath = Files.createTempFile(getClass().getSimpleName(), ".json").toAbsolutePath();
        } catch (IOException e) {
            throw new RuntimeException(e);
        }

        String[] cmd = new String[]{"/home/esbena/.nvm/versions/node/v0.12.7/bin/node", "--harmony", "/home/esbena/_data/ts-spec-reader/src/CLI.js", "--env", mode, "-o", jsonPath.toString()};
        final ProcessBuilder pb = new ProcessBuilder(cmd);
        //pb.directory(Paths.get("../..").toFile());
        try {
            System.out.println("Executing: " + String.join(" ", cmd));
            Process process = pb.start();
            BufferedReader brStd = new BufferedReader(new InputStreamReader(process.getInputStream()));
            BufferedReader brErr = new BufferedReader(new InputStreamReader(process.getErrorStream()));

            String lineStd = null;
            String lineErr = null;
            while ((lineStd = brStd.readLine()) != null || (lineErr = brErr.readLine()) != null) {

                PrintStream stream;
                String line;
                if (lineStd != null) {
                    stream = System.out;
                    line = lineStd;
                } else {
                    stream = System.err;
                    line = lineErr;
                }
                stream.printf("nodejs-process ::: %s%n", line);
            }
            process.waitFor();
            if (process.exitValue() != 0) {
                throw new RuntimeException("Node-process exited with exit code: " + process.exitValue());
            }

            SpecReader specReader = new SpecReader(jsonPath);
            assertNotNull(specReader.getGlobal());
            assertNotNull(specReader.getNamedTypes());
        } catch (IOException e) {
            throw new RuntimeException(e);
        } catch (InterruptedException e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    public void testES5() {
        test("es5");
    }

    @Test
    public void testES5DOM() {
        test("es5-dom");
    }

    @Test
    public void testES6() {
        test("es6");
    }

    @Test
    public void testES6DOM() {
        test("es6-dom");
    }

    @Test
    public void testNode() {
        test("node");
    }
}
